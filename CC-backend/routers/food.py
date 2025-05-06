from fastapi import APIRouter, Form, HTTPException, Body, Depends
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
import logging
import json
from datetime import datetime
from typing import Optional, List # Import List if needed for response models

# Import necessary components from other modules
from database import get_food_collection, get_users_collection # Assuming users needed for validation?
# from models import Food, FoodCreate # Import models if you use them for request/response

logger = logging.getLogger(__name__)

# Define the router. The prefix ensures all routes defined here
# start with /api/food, matching the original structure.
router = APIRouter(
    prefix="/api/food",
    tags=["Food"], # Optional: Adds tags to OpenAPI docs
)

# Dependency function to get the collection
def get_food_db() -> Collection:
    return get_food_collection()

# --- Endpoint Implementations ---
# Keep the function signatures identical to main_old.py

@router.post("") # Corresponds to POST /api/food
async def post_food(
    foodName: str = Form(...),
    quantity: int = Form(...),
    category: str = Form(...),
    dietaryInfo: str = Form(...),
    pickupLocation: str = Form(...),
    pickupTime: str = Form(...),
    photo: str = Form(...), # Expecting JSON string like '{"uri":"data:..."}'
    user: str = Form(...), # This is likely the netId based on other endpoints
    expirationTime: str = Form(...),
    createdAt: str = Form(...), # Consider making this server-generated datetime
    db: Collection = Depends(get_food_db)
):
    logger.info(f"Received food post request by user: {user}, foodName: {foodName}")
    try:
        # Validate photo JSON early
        try:
            json.loads(photo)
        except json.JSONDecodeError:
             logger.warning(f"Invalid JSON format for photo field by user {user}")
             raise HTTPException(status_code=422, detail="Photo field must be a valid JSON string.")

        # Convert createdAt and expirationTime to datetime if desired
        # Example: createdAt_dt = datetime.fromisoformat(createdAt.replace('Z', '+00:00'))
        #         expirationTime_dt = ...

        food_data = {
            "foodName": foodName, "quantity": quantity, "category": category,
            "dietaryInfo": dietaryInfo, "pickupLocation": pickupLocation,
            "pickupTime": pickupTime, "photo": photo, # Store as string as before
            "status": "green",
            "postedBy": user, # Assumes 'user' form field is the netId
            "reportCount": 0,
            "timestamp": datetime.now(), # Use server time
            "reservedBy": "None",
            "expirationTime": expirationTime, # Store as string as before
            "createdAt": createdAt, # Store as string as before
        }

        result = db.insert_one(food_data)
        logger.info(f"Food post created successfully with id: {result.inserted_id} by user: {user}")
        return {"message": "Food post created successfully", "food_id": str(result.inserted_id)}

    except HTTPException as he:
         raise he # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error creating food post for user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while posting food.")



@router.get("") # Corresponds to GET /api/food
async def get_food(db: Collection = Depends(get_food_db)):
    logger.info("Received request to get all food posts.")
    try:
        food_posts_cursor = db.find({})
        food_posts = []
        for food in food_posts_cursor:
            food["id"] = str(food["_id"])
            food.pop("_id")

            # Process photo field
            if "photo" in food and isinstance(food["photo"], str):
                try:
                    photo_data = json.loads(food["photo"])
                    # Assuming frontend expects the 'uri' field directly
                    food["photo"] = photo_data.get("uri", food["photo"]) # Keep original if no uri
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse photo JSON for food item {food['id']}: {food['photo']}")
                    # Keep the original string if parsing fails, or set to ""?
                    # food["photo"] = "" # Uncomment to clear invalid photo data
            else:
                 # Ensure photo field exists even if null or not string
                 food["photo"] = food.get("photo", "")

            # Convert datetime objects to ISO strings if needed for JSON response
            if isinstance(food.get("timestamp"), datetime):
                food["timestamp"] = food["timestamp"].isoformat()

            food_posts.append(food)

        logger.info(f"Returning {len(food_posts)} food posts.")
        return {"food_posts": food_posts} # Match original structure
    except Exception as e:
        logger.error(f"Error fetching food posts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching food posts.")


@router.post("/reserve") # Corresponds to POST /api/food/reserve
async def reserve_food(payload: dict = Body(...), db: Collection = Depends(get_food_db)):
    food_id = payload.get("food_id")
    user = payload.get("user") # Assuming this is the netId of the reserver
    logger.info(f"Received reservation request for foodId: {food_id} by user: {user}")

    if not food_id or not user:
        logger.warning(f"Missing food_id or user in reservation request. food_id: {food_id}, user: {user}")
        raise HTTPException(status_code=400, detail="food_id and user are required")

    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for reservation: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    try:
        # Combine find and update for atomicity if possible, otherwise handle race conditions
        food_item = db.find_one({"_id": food_object_id})

        if not food_item:
            logger.warning(f"Food item not found for reservation: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food item not found")

        current_status = food_item.get("status", "green")
        reserved_by = food_item.get("reservedBy", "None")

        if current_status == "yellow":
             logger.warning(f"Attempt to reserve already reserved food item: foodId={food_id}, current reservedBy={reserved_by}, attempted by user={user}")
             raise HTTPException(status_code=400, detail="Food item is already reserved")
        elif current_status == "red":
            logger.warning(f"Attempt to reserve completed/unavailable food item: foodId={food_id}, attempted by user={user}")
            raise HTTPException(status_code=400, detail="Food item is no longer available")
        elif current_status != "green":
             logger.warning(f"Attempt to reserve food item with unexpected status '{current_status}': foodId={food_id}")
             raise HTTPException(status_code=400, detail=f"Food item is not available for reservation (status: {current_status})")


        # Attempt to update, ensuring it's still green
        result = db.update_one(
            {"_id": food_object_id, "status": "green"},
            {"$set": {"status": "yellow", "reservedBy": user}}
        )

        if result.modified_count == 0:
            logger.error(f"Failed to reserve food item {food_id} for user {user}. Status might have changed.")
            # Check status again for better error message
            refreshed_item = db.find_one({"_id": food_object_id})
            if not refreshed_item:
                 raise HTTPException(status_code=404, detail="Food item not found (disappeared before update).")
            elif refreshed_item.get("status") != "green":
                 raise HTTPException(status_code=400, detail="Food item is no longer available for reservation (status changed).")
            else:
                 raise HTTPException(status_code=500, detail="Failed to reserve the food item due to an unexpected conflict.")

        logger.info(f"Food item {food_id} successfully reserved by user {user}")
        return {"message": "Food item reserved successfully", "food_id": food_id, "reservedBy": user}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error reserving food item {food_id} for user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during reservation.")


@router.post("/complete") # Corresponds to POST /api/food/complete
async def complete_transaction(
    food_id: str = Form(...),
    user: str = Form(...), # User trying to complete (should match reservedBy)
    db: Collection = Depends(get_food_db)
):
    logger.info(f"Received transaction completion request for foodId: {food_id} by user: {user}")

    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for completion: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    try:
        food_item = db.find_one({"_id": food_object_id})

        if not food_item:
            logger.warning(f"Food item not found for completion: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food item not found")

        if food_item.get("status") != "yellow":
             logger.warning(f"Attempt to complete transaction for non-reserved item: foodId={food_id}, status={food_item.get('status')}, user={user}")
             raise HTTPException(status_code=400, detail="Transaction cannot be completed. Item is not in reserved status.")

        if food_item.get("reservedBy") != user:
            logger.warning(f"Unauthorized attempt to complete transaction: foodId={food_id}, reservedBy={food_item.get('reservedBy')}, attempted by user={user}")
            raise HTTPException(status_code=403, detail="You are not authorized to complete this transaction (reserved by someone else).")

        # Attempt update, ensuring state matches
        result = db.update_one(
            {"_id": food_object_id, "status": "yellow", "reservedBy": user},
            {"$set": {"status": "red"}} # Mark as completed/unavailable
        )

        if result.modified_count == 0:
            logger.error(f"Failed to complete transaction for food item {food_id} by user {user}. State might have changed.")
            # Check again for specific reason
            refreshed_item = db.find_one({"_id": food_object_id})
            if not refreshed_item:
                 raise HTTPException(status_code=404, detail="Food item not found (disappeared before update).")
            elif refreshed_item.get("status") != "yellow" or refreshed_item.get("reservedBy") != user:
                 raise HTTPException(status_code=409, detail="Food item state changed before completion could occur.")
            else:
                 raise HTTPException(status_code=500, detail="Failed to complete the transaction due to an unexpected conflict.")

        logger.info(f"Transaction completed successfully for foodId: {food_id} by user: {user}")
        return {"message": "Transaction completed successfully", "food_id": food_id, "status": "red"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error completing transaction for food {food_id} by user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during transaction completion.")


@router.get("/search") # Corresponds to GET /api/food/search
async def search_food(
    foodName: Optional[str] = None,
    category: Optional[str] = None,
    pickupLocation: Optional[str] = None,
    pickupTime: Optional[str] = None,
    db: Collection = Depends(get_food_db)
):
    query = {}
    log_params = []
    if foodName:
        query["foodName"] = {"$regex": foodName, "$options": "i"}
        log_params.append(f"foodName={foodName}")
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
        log_params.append(f"category={category}")
    if pickupLocation:
        query["pickupLocation"] = {"$regex": pickupLocation, "$options": "i"}
        log_params.append(f"pickupLocation={pickupLocation}")
    if pickupTime:
        query["pickupTime"] = {"$regex": pickupTime, "$options": "i"}
        log_params.append(f"pickupTime={pickupTime}")

    # Add filter for status != 'red'? Maybe only show 'green' and 'yellow'?
    # query["status"] = {"$ne": "red"} # Example: Exclude completed items

    logger.info(f"Received food search request with params: {', '.join(log_params) if log_params else 'None'}")

    try:
        food_posts_cursor = db.find(query)
        food_posts = []
        for food in food_posts_cursor:
            food["id"] = str(food["_id"])
            food.pop("_id")
            # Process photo field consistently
            if "photo" in food and isinstance(food["photo"], str):
                try:
                    photo_data = json.loads(food["photo"])
                    food["photo"] = photo_data.get("uri", food["photo"])
                except json.JSONDecodeError:
                     # Keep original or clear
                     pass # Keep original string on error
            else:
                food["photo"] = food.get("photo", "")

            # Convert datetimes
            if isinstance(food.get("timestamp"), datetime):
                food["timestamp"] = food["timestamp"].isoformat()

            food_posts.append(food)

        logger.info(f"Food search returned {len(food_posts)} results.")
        # Return in the original format expected by the frontend
        return {"food_posts": food_posts}
    except Exception as e:
        logger.error(f"Error during food search with query {query}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during food search.")


@router.get("/poster-netid/{food_id}") # Corresponds to GET /api/food/poster-netid/{food_id}
async def get_poster_netid(food_id: str, db: Collection = Depends(get_food_db)):
    logger.info(f"Received request for poster netId for foodId: {food_id}")
    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for get_poster_netid: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    try:
        # Projection: only fetch the postedBy field
        food_post = db.find_one({"_id": food_object_id}, {"postedBy": 1})
        if not food_post:
            logger.warning(f"Food post not found for get_poster_netid: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food post not found")

        poster_netid = food_post.get("postedBy")
        if not poster_netid:
            logger.error(f"Food post {food_id} found but missing 'postedBy' field.")
            raise HTTPException(status_code=404, detail="Poster information not found for this food post.")

        logger.info(f"Found poster netId '{poster_netid}' for foodId: {food_id}")
        return {"netId": poster_netid} # Return in the expected format

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching poster netId for food {food_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching poster information.")