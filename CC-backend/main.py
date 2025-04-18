from fastapi import FastAPI, Form, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId # <--- Import InvalidId
from pymongo.errors import DuplicateKeyError
import os
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError
from typing import Optional
from fastapi import Body
load_dotenv()
from datetime import datetime
from typing import List, Optional
import logging
import json # <--- Import json if used standalone
import hashlib

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Helper function to check the password hash
def verify_password(stored_password: str, provided_password: str) -> bool:
    return stored_password == hash_password(provided_password)

# --- Middleware (Keep as is) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup (Keep as is) ---
try:
    client = MongoClient(os.getenv("MONGO_URI"), tls=True, tlsAllowInvalidCertificates=True)
    db = client.food_db
    food_collection = db.food_posts
    report_collection = db.reports
    users_collection = db.users

    # Test connection and ensure collections exist
    db_info = client.server_info()
    logger.info(f"Successfully connected to MongoDB: {db_info['version']}")
    collections = db.list_collection_names()
    logger.info(f"Available collections: {collections}")
    if "reports" not in collections:
        db.create_collection("reports")
        logger.info("Created 'reports' collection")
    if "users" not in collections: # Ensure users collection check
        db.create_collection("users")
        logger.info("Created 'users' collection")
    logger.info(f"Using food_collection: {food_collection.name}")
    logger.info(f"Using report_collection: {report_collection.name}")
    logger.info(f"Using users_collection: {users_collection.name}")

except Exception as e:
    logger.error(f"MongoDB connection error: {str(e)}", exc_info=True)
    # Optional: raise an error here if connection is critical for startup
    # raise RuntimeError(f"Failed to connect to MongoDB: {e}") from e
    
class UserEmailLogin(BaseModel):
    email: str
    password: str

# --- File Upload Setup (Keep as is) ---
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- Pydantic Models (Keep as is) ---
class ReportBase(BaseModel):
    postId: str
    user1ID: str
    user2ID:str
    message: str
    # createdId: int # This field seems unused in report creation/fetching logic? Consider removing if unnecessary.
    isSubmitted: bool = True

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: Optional[str] = None
    submittedAt: datetime
    reviewStatus: str = "pending"
    reviewedBy: Optional[str] = None

    class Config:
        orm_mode = True
        extra = "allow" # Keep allowing extra fields from DB

class UserRegistration(BaseModel):
    googleId: str
    email: str
    netId: str
    fullName: str
    phoneNumber: Optional[str] = None
    picture: Optional[str] = None

class GoogleIdRequest(BaseModel):
    googleId: str
class EmailCheckRequest(BaseModel):
    email: str
@app.post("/check-email")
async def check_email(data: EmailCheckRequest):
    user = await users_collection.find_one({"email": user.email})
    return {"exists": bool(user)}
@app.post("/api/users/check-email")
async def check_email(data: EmailCheckRequest):
    user = users_collection.find_one({"email": data.email})
    return {"exists": bool(user)}

@app.post("/api/users/signup")
async def signup(user: UserCreate):
    try:
        # Hash the user's password for security
        
        hashed_password = hash_password(user.password)

        # Check if the email already exists
        existing_user = users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered. Please log in, or sign up with a new Email")

        # Check if the username already exists
        existing_user = users_collection.find_one({"username": user.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
            
        # Check if the netId already exists
        existing_user = users_collection.find_one({"netId": user.netId})
        if existing_user:
            raise HTTPException(status_code=409, detail="This Net ID is already registered")

        # Create the user document
        new_user = {
            "username": user.username,
            "email": user.email,
            "password": hashed_password,
            "netId": user.netId,
            "googleId": user.netId,  # Populate googleId with netId for backward compatibility
            "fullName": user.fullName,
            "phoneNumber": user.phoneNumber,
            "picture": user.picture,
            "createdAt": datetime.now(),
            "role": "user",
            "postCount": 0,
            "reservationCount": 0
        }

        # Insert the new user into the database
        result = users_collection.insert_one(new_user)
        print("Received user data:", user.dict())
        if result.inserted_id:
            return {"success": True, "message": "User registered successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to register user")
            
    except HTTPException as he:
        raise he
    except ValidationError as ve:
        print("Validation error:", str(ve))
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        print("Error during signup:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
# Add this class for email login
class UserEmailLogin(BaseModel):
    email: str
    password: str

@app.post("/api/users/email-login")
async def email_login(user: UserEmailLogin):
    try:
        # Find the user by email instead of username
        db_user = users_collection.find_one({"email": user.email})
        
        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify the password
        if not verify_password(db_user["password"], user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login time
        users_collection.update_one(
            {"_id": db_user["_id"]},
            {"$set": {"lastLogin": datetime.now()}}
        )
        
        # Return user information (excluding password)
        user_response = {k: v for k, v in db_user.items() if k != "password"}
        user_response["_id"] = str(user_response["_id"])  # Convert ObjectId to string
        
        return {
            "success": True, 
            "message": "Login successful",
            "user": user_response
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/users/auth-check")
async def auth_check(user: UserEmailLogin):
    try:
        # Find the user by username
        db_user = users_collection.find_one({"username": user.username})
        
        if not db_user or not verify_password(db_user["password"], user.password):
            return JSONResponse(status_code=401, content={"message": "Invalid credentials"})

        # Convert ObjectId to string for JSON serialization
        user_response = {k: v for k, v in db_user.items() if k != "password"}
        user_response["_id"] = str(user_response["_id"])
        
        return {
            "success": True,
            "user": user_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
       


# === API Endpoints (Corrected Exception Handling) ===

@app.post("/api/food")
async def post_food(
    foodName: str = Form(...),
    quantity: int = Form(...),
    category: str = Form(...),
    dietaryInfo: str = Form(...),
    pickupLocation: str = Form(...),
    pickupTime: str = Form(...),
    photo: str = Form(...), # Expecting JSON string like '{"uri":"data:..."}'
    user: str = Form(...),
    expirationTime: str = Form(...),
    createdAt: str = Form(...),
):
    # FastAPI's Form(...) handles basic required field checks -> 422 error
    # The 'if not all(...)' check below raising 500 is redundant if Form(...) is used correctly.
    # Keeping the broad try/except for unexpected DB errors.

    logger.info(f"Received food post request by user: {user}, foodName: {foodName}")
    try:
        # Optional: Validate photo is valid JSON string early
        try:
            json.loads(photo)
        except json.JSONDecodeError:
             logger.warning(f"Invalid JSON format for photo field by user {user}")
             raise HTTPException(status_code=422, detail="Photo field must be a valid JSON string.")

        food_data = {
            "foodName": foodName, "quantity": quantity, "category": category,
            "dietaryInfo": dietaryInfo, "pickupLocation": pickupLocation,
            "pickupTime": pickupTime, "photo": photo, "status": "green",
            "postedBy": user, "reportCount": 0,
            "timestamp": datetime.now(), # Use current time, db command might be less reliable
            "reservedBy": "None", "expirationTime": expirationTime,
            "createdAt": createdAt,
        }

        result = food_collection.insert_one(food_data)
        logger.info(f"Food post created successfully with id: {result.inserted_id} by user: {user}")
        return {"message": "Food post created successfully", "food_id": str(result.inserted_id)}

    except HTTPException as he:
         raise he # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error creating food post for user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while posting food.")


@app.get("/api/food")
async def get_food():
    logger.info("Received request to get all food posts.")
    try:
        food_posts_cursor = food_collection.find({}) # Get cursor first
        food_posts = []
        for food in food_posts_cursor:
            food["id"] = str(food["_id"])
            original_id = food.pop("_id") # Remove original ObjectId

            # Process photo field
            if "photo" in food and isinstance(food["photo"], str):
                try:
                    photo_data = json.loads(food["photo"])
                    food["photo"] = photo_data.get("uri", "")
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse photo JSON for food item {food['id']}: {food['photo']}")
                    food["photo"] = ""
            food_posts.append(food)

        logger.info(f"Returning {len(food_posts)} food posts.")
        return {"food_posts": food_posts}
    except Exception as e:
        logger.error(f"Error fetching food posts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching food posts.")


@app.post("/api/food/reserve")
async def reserve_food(payload: dict = Body(...)):
    food_id = payload.get("food_id")
    user = payload.get("user")
    logger.info(f"Received reservation request for foodId: {food_id} by user: {user}")

    # --- Validation and Initial Checks ---
    if not food_id or not user:
        logger.warning(f"Missing food_id or user in reservation request. food_id: {food_id}, user: {user}")
        raise HTTPException(status_code=400, detail="food_id and user are required")

    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for reservation: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    # --- Core Logic ---
    try:
        food_item = food_collection.find_one({"_id": food_object_id})
        if not food_item:
            logger.warning(f"Food item not found for reservation: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food item not found")

        # Check status (can be combined with update for atomicity, but separate check is clearer)
        current_status = food_item.get("status", "green") # Default to green if missing? Or handle error?
        reserved_by = food_item.get("reservedBy", "None")

        if current_status == "yellow": # Check for yellow specifically
             logger.warning(f"Attempt to reserve already reserved food item: foodId={food_id}, current reservedBy={reserved_by}, attempted by user={user}")
             # Return 400 if reserved by anyone
             raise HTTPException(status_code=400, detail="Food item is already reserved")
        elif current_status == "red": # Check for red specifically
            logger.warning(f"Attempt to reserve completed/unavailable food item: foodId={food_id}, attempted by user={user}")
            raise HTTPException(status_code=400, detail="Food item is no longer available")

        # Update the food item's status and reservedBy field
        # Use find_one_and_update or add condition to update_one for atomicity if needed
        result = food_collection.update_one(
            {"_id": food_object_id, "status": "green"}, # Ensure it's still green before reserving
            {"$set": {"status": "yellow", "reservedBy": user}}
        )

        if result.modified_count == 0:
            # This could happen if the status changed between find_one and update_one
            logger.error(f"Failed to reserve food item {food_id} for user {user}. Item status might have changed or item disappeared.")
            # Check again to provide a more specific error
            refreshed_item = food_collection.find_one({"_id": food_object_id})
            if not refreshed_item:
                 raise HTTPException(status_code=404, detail="Food item not found (disappeared before update).")
            elif refreshed_item.get("status") != "green":
                 raise HTTPException(status_code=400, detail="Food item is no longer available for reservation.")
            else: # Unknown reason
                 raise HTTPException(status_code=500, detail="Failed to reserve the food item due to an unexpected issue.")

        logger.info(f"Food item {food_id} successfully reserved by user {user}")
        return {"message": "Food item reserved successfully", "food_id": food_id, "reservedBy": user}

    except HTTPException as he:
        raise he # Re-raise specific HTTP exceptions (404, 400)
    except Exception as e:
        logger.error(f"Error reserving food item {food_id} for user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during reservation.")


@app.post("/api/food/complete")
async def complete_transaction(food_id: str = Form(...), user: str = Form(...)):
    logger.info(f"Received transaction completion request for foodId: {food_id} by user: {user}")

    # --- Validation ---
    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for completion: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    # --- Core Logic ---
    try:
        food_item = food_collection.find_one({"_id": food_object_id})
        if not food_item:
            logger.warning(f"Food item not found for completion: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food item not found")

        # Check if the item is actually reserved and by the correct user
        if food_item.get("status") != "yellow":
             logger.warning(f"Attempt to complete transaction for non-reserved item: foodId={food_id}, status={food_item.get('status')}, user={user}")
             raise HTTPException(status_code=400, detail="Transaction cannot be completed. Item is not reserved.")
        if food_item.get("reservedBy") != user:
            logger.warning(f"Unauthorized attempt to complete transaction: foodId={food_id}, reservedBy={food_item.get('reservedBy')}, attempted by user={user}")
            raise HTTPException(status_code=403, detail="You are not authorized to complete this transaction")

        # Update the food item's status to "red"
        result = food_collection.update_one(
            {"_id": food_object_id, "status": "yellow", "reservedBy": user}, # Ensure state hasn't changed
            {"$set": {"status": "red"}}
        )

        if result.modified_count == 0:
            # This implies the state changed between find_one and update_one
            logger.error(f"Failed to complete transaction for food item {food_id} by user {user}. State might have changed.")
             # Check again to provide a more specific error
            refreshed_item = food_collection.find_one({"_id": food_object_id})
            if not refreshed_item:
                 raise HTTPException(status_code=404, detail="Food item not found (disappeared before update).")
            elif refreshed_item.get("status") != "yellow" or refreshed_item.get("reservedBy") != user:
                 raise HTTPException(status_code=409, detail="Food item state changed before completion.") # 409 Conflict
            else: # Unknown reason
                 raise HTTPException(status_code=500, detail="Failed to complete the transaction due to an unexpected issue.")

        logger.info(f"Transaction completed successfully for foodId: {food_id} by user: {user}")
        return {"message": "Transaction completed successfully", "food_id": food_id, "status": "red"}

    except HTTPException as he:
        raise he # Re-raise specific HTTP exceptions (404, 403, 400, 409)
    except Exception as e:
        logger.error(f"Error completing transaction for food {food_id} by user {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during transaction completion.")


# Use the corrected submit_report from the previous step
@app.post("/api/report")
async def submit_report(postId: str = Form(...), message: str = Form(...), user1Id: str = Form(...), user2Id: str = Form(...)):
    # --- Validation and Initial Checks ---
    try:
        post_object_id = ObjectId(postId)
    except InvalidId:
        logger.warning(f"Invalid postId format received for reporting: {postId}")
        raise HTTPException(status_code=400, detail=f"Invalid postId format: {postId}")
    except Exception as e:
        logger.error(f"Error converting postId '{postId}' to ObjectId for reporting: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing post ID.")

    logger.info(f"Received report request: postId={postId}, user1Id={user1Id}, user2Id={user2Id}")

    food_post = food_collection.find_one({"_id": post_object_id})
    if not food_post:
        logger.warning(f"Food post not found for reporting: postId={postId}")
        raise HTTPException(status_code=404, detail="Food post not found")

    # --- Core Logic (potential for unexpected DB errors) ---
    try:
        report_data = {
            "postId": postId,
            "user1ID": user1Id,
            "user2ID": user2Id,
            "message": message,
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None,
        }

        logger.info(f"Inserting report into database for postId: {postId}")
        result = report_collection.insert_one(report_data)
        report_id = result.inserted_id
        logger.info(f"Report inserted with ID: {report_id} for postId: {postId}")

        # Increment report count on the food post
        update_result = food_collection.update_one(
            {"_id": post_object_id},
            {"$inc": {"reportCount": 1}}
        )
        logger.info(f"Updated food post report count for postId {postId}: {update_result.modified_count} document(s) modified")

        if update_result.matched_count == 0:
             logger.error(f"Failed to find food post {postId} for report count increment after initial check.")
             # Report was still submitted, so proceed, but log error.

        return {"message": "Report submitted successfully", "report_id": str(report_id)}

    except HTTPException as he:
        # This shouldn't be hit if checks are done above, but as a safeguard
        raise he
    except Exception as e:
        logger.error(f"Unexpected error processing report for postId {postId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred while processing the report.")


@app.get("/api/reports", response_model=List[Report])
async def get_reports():
    logger.info("Received request to get all reports.")
    try:
        reports_cursor = report_collection.find()
        reports = []
        for report in reports_cursor:
            report["id"] = str(report["_id"])
            report.pop("_id")
            # Consider removing 'createdId' if it's not used or defined in the model properly
            if 'createdId' in report and not hasattr(ReportBase, 'createdId'):
                 report.pop('createdId')
            reports.append(report)

        logger.info(f"Returning {len(reports)} reports.")
        # Use response_model for validation before returning
        # Pydantic will automatically convert the list of dicts
        return reports
    except ValidationError as ve:
         logger.error(f"Validation error formatting reports response: {ve}", exc_info=True)
         raise HTTPException(status_code=500, detail="Error formatting report data.")
    except Exception as e:
        logger.error(f"Error fetching reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching reports.")


@app.put("/api/report/{report_id}")
async def update_report_status(report_id: str, status: str = Form(...), admin_id: str = Form(...)):
    logger.info(f"Received request to update report {report_id} status to {status} by admin {admin_id}")

    # --- Validation ---
    try:
        report_object_id = ObjectId(report_id)
    except InvalidId:
        logger.warning(f"Invalid report_id format for update: {report_id}")
        raise HTTPException(status_code=400, detail=f"Invalid report_id format: {report_id}")

    # --- Core Logic ---
    try:
        result = report_collection.update_one(
            {"_id": report_object_id}, # Find by ObjectId
            {"$set": {"reviewStatus": status, "reviewedBy": admin_id, "reviewedAt": datetime.now()}} # Add reviewedAt timestamp
        )

        if result.matched_count == 0:
            logger.warning(f"Report not found for status update: reportId={report_id}")
            raise HTTPException(status_code=404, detail="Report not found")

        logger.info(f"Report {report_id} status updated successfully to {status} by admin {admin_id}")
        return {"message": "Report status updated successfully"}

    except HTTPException as he:
        raise he # Re-raise 404
    except Exception as e:
        logger.error(f"Error updating report status for report {report_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating report status.")


@app.get("/api/test-report")
async def test_report():
    logger.info("Received request for /api/test-report endpoint.")
    # This endpoint seems primarily for debugging. Keep its original structure.
    try:
        test_report = {
            "postId": "test_post_id_" + str(int(datetime.now().timestamp())), # Make postId unique
            "message": "This is a test report",
            # "createdId": 999, # Remove if not in schema/used
            "user1ID": "test_reporter",
            "user2ID": "test_poster",
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None
        }
        result = report_collection.insert_one(test_report)
        inserted_id = result.inserted_id
        logger.info(f"Test report inserted with id: {inserted_id}")
        inserted_report = report_collection.find_one({"_id": inserted_id})

        if not inserted_report:
             logger.error("Failed to retrieve newly inserted test report.")
             return {"success": False, "error": "Failed to retrieve inserted test report"}

        # Prepare response, ensuring _id is handled
        response_report = {k: v for k, v in inserted_report.items() if k != "_id"}
        response_report["id"] = str(inserted_id)

        return {
            "success": True,
            "report_id": str(inserted_id),
            "inserted_report": response_report
        }
    except Exception as e:
        logger.error(f"Error in /api/test-report: {e}", exc_info=True)
        # Keep original return structure for this specific test endpoint
        return {"success": False, "error": str(e)}


@app.get("/api/food/search")
async def search_food(
  foodName: Optional[str] = None,
  category: Optional[str] = None,
  pickupLocation: Optional[str] = None,
  pickupTime: Optional[str] = None,
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
        # Be careful with regex on time - might need more specific query
        query["pickupTime"] = {"$regex": pickupTime, "$options": "i"}
        log_params.append(f"pickupTime={pickupTime}")

    logger.info(f"Received food search request with params: {', '.join(log_params) if log_params else 'None'}")

    try:
        food_posts_cursor = food_collection.find(query)
        food_posts = []
        for food in food_posts_cursor:
            food["id"] = str(food["_id"])
            original_id = food.pop("_id")
            # Process photo field consistently
            if "photo" in food and isinstance(food["photo"], str):
                try:
                    photo_data = json.loads(food["photo"])
                    food["photo"] = photo_data.get("uri", "")
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse photo JSON during search for food item {food['id']}: {food['photo']}")
                    food["photo"] = ""
            food_posts.append(food)

        logger.info(f"Food search returned {len(food_posts)} results.")
        return {"food_posts": food_posts}
    except Exception as e:
        logger.error(f"Error during food search with query {query}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during food search.")


# User registration endpoint already has the improved try/except structure
@app.post("/api/users/register")
async def register_user(user: UserRegistration):
    logger.info(f"Received user registration request for googleId: {user.googleId}, netId: {user.netId}")
    try:
        existing_user_google = users_collection.find_one({"googleId": user.googleId})
        if existing_user_google:
            logger.info(f"Updating existing user found by googleId: {user.googleId}")
            update_data = {
                # Allow updating netId only if it doesn't conflict? Or disallow netId update?
                # Current logic allows overwriting netId which might be unintentional.
                # Let's assume netId shouldn't change easily after registration via Google ID update.
                # "netId": user.netId,
                "fullName": user.fullName,
                "phoneNumber": user.phoneNumber,
                "picture": user.picture,
                "updatedAt": datetime.now()
            }
            # Remove None values to avoid overwriting existing data with None
            update_data = {k: v for k, v in update_data.items() if v is not None}

            result = users_collection.update_one(
                {"googleId": user.googleId},
                {"$set": update_data}
            )
            # Check result.modified_count if needed
            logger.info(f"User {user.googleId} updated successfully.")
            return {"success": True, "message": "User updated successfully"}

        # Check for NetID conflict only if creating a new user
        existing_user_netid = users_collection.find_one({"netId": user.netId})
        if existing_user_netid:
            logger.warning(f"Registration conflict: Net ID {user.netId} already registered.")
            raise HTTPException(status_code=409, detail="This Net ID is already registered")

        # Create new user
        logger.info(f"Creating new user for googleId: {user.googleId}, netId: {user.netId}")
        user_data = user.dict()
        user_data["createdAt"] = datetime.now()
        user_data["updatedAt"] = datetime.now() # Also add updatedAt on creation
        user_data["role"] = "user"
        user_data["postCount"] = 0
        user_data["reservationCount"] = 0

        result = users_collection.insert_one(user_data)
        if result.inserted_id:
            logger.info(f"User {user.netId} registered successfully with id: {result.inserted_id}")
            return {"success": True, "message": "User registered successfully"}
        else:
            # This case is unlikely if insert_one doesn't raise an error, but as a safeguard
            logger.error(f"Failed to register user {user.netId}: insert_one returned no ID.")
            raise HTTPException(status_code=500, detail="Failed to register user due to an unexpected database issue.")

    except HTTPException as he:
        # Re-raise specific exceptions like 409 Conflict
        raise he
    except DuplicateKeyError as dke:
         # This might happen if there's a unique index violation not caught by earlier checks
         logger.error(f"Duplicate key error during registration for netId {user.netId} or googleId {user.googleId}: {dke}", exc_info=True)
         # Determine which field caused the duplication if possible from dke details
         if "netId" in str(dke):
              raise HTTPException(status_code=409, detail="This Net ID is already registered (duplicate key).")
         elif "googleId" in str(dke):
             # Should have been caught by find_one, but handle defensively
             raise HTTPException(status_code=409, detail="This Google ID is already registered (duplicate key).")
         else:
             raise HTTPException(status_code=409, detail="User registration conflict (duplicate key).")
    except Exception as e:
        logger.error(f"Unexpected error during registration for netId {user.netId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during user registration.")


# Get user by googleId endpoint already has the improved try/except structure
@app.get("/api/users/{googleId}")
async def get_user(googleId: str):
    logger.info(f"Received request to get user by googleId: {googleId}")
    try:
        user = users_collection.find_one({"googleId": googleId})
        if not user:
            logger.warning(f"User not found for googleId: {googleId}")
            raise HTTPException(status_code=404, detail="User not found")

        user["id"] = str(user["_id"]) # Use 'id' for consistency?
        user.pop("_id")
        logger.info(f"Returning user data for googleId: {googleId}")
        return user

    except HTTPException as he:
        raise he # Re-raise 404
    except Exception as e:
        logger.error(f"Error fetching user by googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching user data.")


@app.get("/api/users/profile/{net_id}")
async def get_user_profile(net_id: str):
    logger.info(f"Received request for user profile: netId={net_id}")

    # --- Find User ---
    user = users_collection.find_one({"netId": net_id})
    if not user:
        logger.warning(f"User profile not found: netId={net_id}")
        raise HTTPException(status_code=404, detail="User not found")

    # --- Fetch Profile Data (wrap potentially heavy DB calls) ---
    try:
        logger.info(f"Found user {net_id}, fetching profile data.")
        post_count = food_collection.count_documents({"postedBy": net_id})
        received_count = food_collection.count_documents({"reservedBy": net_id}) # Assumes 'completed' transactions still have reservedBy field set? Or should query based on status 'red' and reserver?

        post_history_cursor = food_collection.find({"postedBy": net_id}).sort("createdAt", -1) # Add sorting
        post_history = []
        for post in post_history_cursor:
            post["id"] = str(post["_id"])
            post.pop("_id")
             # Process photo field
            if "photo" in post and isinstance(post["photo"], str):
                try:
                    photo_data = json.loads(post["photo"])
                    post["photo"] = photo_data.get("uri", "")
                except json.JSONDecodeError: post["photo"] = ""
            post_history.append(post)

        received_history_cursor = food_collection.find({"reservedBy": net_id}).sort("pickupTime", -1) # Sort by pickup time?
        received_history = []
        for received in received_history_cursor:
            received["id"] = str(received["_id"])
            received.pop("_id")
             # Process photo field
            if "photo" in received and isinstance(received["photo"], str):
                try:
                    photo_data = json.loads(received["photo"])
                    received["photo"] = photo_data.get("uri", "")
                except json.JSONDecodeError: received["photo"] = ""
            received_history.append(received)

        # --- Prepare and Return Response ---
        response = {
            "username": user.get("fullName", "N/A"),
            "email": user.get("email", "N/A"),
            "profilePicture": user.get("picture", ""),
            "post_count": post_count,
            "received_count": received_count,
            "post_history": post_history,
            "received_history": received_history,
        }
        logger.info(f"Successfully fetched profile data for netId: {net_id}")
        return response

    except HTTPException as he:
         # This shouldn't be hit if user check is done above
         raise he
    except Exception as e:
        logger.error(f"Error fetching profile details for netId {net_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching profile data.")


@app.post("/api/users/check")
async def check_user(request: GoogleIdRequest):
    googleId = request.googleId
    logger.info(f"Received user check request for googleId: {googleId}")
    try:
        user = users_collection.find_one({"googleId": googleId})
        if not user:
            logger.info(f"User check: User not found for googleId: {googleId}")
            # Standardize to raise HTTPException for consistency
            raise HTTPException(status_code=404, detail="User not found")
            # return JSONResponse(status_code=404, content={"message": "User not found"}) # Old way

        user["id"] = str(user["_id"]) # Use 'id'
        user.pop("_id")
        logger.info(f"User check: Found user for googleId: {googleId}")
        return user
    except HTTPException as he:
         raise he # Re-raise 404
    except Exception as e:
        logger.error(f"Error checking user by googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during user check.")


@app.get("/api/users/netid/{googleId}")
async def get_user_by_googleId(googleId: str):
    logger.info(f"Received request to get netId for googleId: {googleId}")
    try:
        user = users_collection.find_one({"googleId": googleId}, {"netId": 1}) # Projection: only fetch netId
        if not user:
            logger.warning(f"User not found when fetching netId for googleId: {googleId}")
            raise HTTPException(status_code=404, detail="User not found" ) # Simplified detail

        # user will be {"_id": ObjectId(...), "netId": "..."} or None
        net_id = user.get("netId")
        if not net_id:
            # This case means user exists but has no netId field - data inconsistency?
            logger.error(f"User found for googleId {googleId} but missing netId field.")
            raise HTTPException(status_code=500, detail="User data incomplete.")

        logger.info(f"Found netId '{net_id}' for googleId: {googleId}")
        return {"netId": net_id}

    except HTTPException as he:
        raise he # Re-raise 404 or 500
    except Exception as e:
        logger.error(f"Error fetching netId for googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching netId.")


@app.get("/api/food/poster-netid/{food_id}")
async def get_poster_netid(food_id: str):
    logger.info(f"Received request for poster netId for foodId: {food_id}")
    # --- Validation ---
    try:
        food_object_id = ObjectId(food_id)
    except InvalidId:
        logger.warning(f"Invalid food_id format for get_poster_netid: {food_id}")
        raise HTTPException(status_code=400, detail=f"Invalid food_id format: {food_id}")

    # --- Core Logic ---
    try:
        # Projection: only fetch the postedBy field
        food_post = food_collection.find_one({"_id": food_object_id}, {"postedBy": 1})
        if not food_post:
            logger.warning(f"Food post not found for get_poster_netid: foodId={food_id}")
            raise HTTPException(status_code=404, detail="Food post not found")

        poster_netid = food_post.get("postedBy")
        if not poster_netid:
             # Should not happen if postedBy is mandatory on creation, but handle defensively
            logger.error(f"Food post {food_id} found but missing 'postedBy' field.")
            raise HTTPException(status_code=404, detail="Poster information not found in food post data.") # Treat missing info as 'not found'

        logger.info(f"Found poster netId '{poster_netid}' for foodId: {food_id}")
        return {"netId": poster_netid}

    except HTTPException as he:
        raise he # Re-raise 404/400
    except Exception as e:
        logger.error(f"Error fetching poster netId for food {food_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching poster information.")


@app.get("/api/report/can-report/{post_id}/{user_id}")
async def can_report(post_id: str, user_id: str):
    logger.info(f"Received 'can-report' check: postId={post_id}, userId={user_id}")
    # --- Validation ---
    try:
        post_object_id = ObjectId(post_id)
    except InvalidId:
        logger.warning(f"Invalid post_id format for can_report: {post_id}")
        raise HTTPException(status_code=400, detail=f"Invalid post_id format: {post_id}")

    # --- Core Logic ---
    try:
        # Find post, only fetch needed field
        food_post = food_collection.find_one({"_id": post_object_id}, {"postedBy": 1})
        if not food_post:
            logger.warning(f"Food post not found for can_report check: postId={post_id}")
            raise HTTPException(status_code=404, detail="Food post not found")

        if food_post.get("postedBy") == user_id:
            logger.info(f"User {user_id} cannot report own post {post_id}.")
            # Return directly, not an exception
            return {"canReport": False, "reason": "You cannot report your own post"}

        # Check if user has already reported this post
        existing_report = report_collection.find_one({
            "postId": post_id, # Query using the string postId stored in reports
            "user1ID": user_id
        }, {"_id": 1}) # Only need to know if it exists

        if existing_report:
            logger.info(f"User {user_id} has already reported post {post_id}.")
            return {"canReport": False, "reason": "You have already reported this post"}

        logger.info(f"User {user_id} can report post {post_id}.")
        return {"canReport": True, "reason": None}

    except HTTPException as he:
        raise he # Re-raise 404/400
    except Exception as e:
        logger.error(f"Error during can_report check for post {post_id}, user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while checking report eligibility.")

