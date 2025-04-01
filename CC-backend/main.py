from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
from fastapi import Body
load_dotenv()
from datetime import datetime
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(os.getenv("MONGO_URI"), tls=True, tlsAllowInvalidCertificates=True)
db = client.food_db
food_collection = db.food_posts

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
report_collection = db.reports  # Define before usage
try:
    # Test the MongoDB connection
    db_info = client.server_info()
    print(f"Successfully connected to MongoDB: {db_info['version']}")
    
    # Verify collections
    collections = db.list_collection_names()
    print(f"Available collections: {collections}")
    
    # Ensure the reports collection exists
    if "reports" not in collections:
        db.create_collection("reports")
        print("Created 'reports' collection")
    
    print(f"Using food_collection: {food_collection.name}")
    print(f"Using report_collection: {report_collection.name}")
except Exception as e:
    print(f"MongoDB connection error: {str(e)}")

@app.post("/api/food")
async def post_food(
    foodName: str = Form(...),
    quantity: int = Form(...),
    category: str = Form(...),
    dietaryInfo: str = Form(None),
    pickupLocation: str = Form(...),
    pickupTime: str = Form(...),
    photo: str = Form(...),
    user: str = Form(...),
    expirationTime: str = Form(...),
   
):
    try:
        if not all([foodName, quantity, category, pickupLocation, pickupTime, photo]):
            raise HTTPException(status_code=400, detail="All required fields must be filled")

        

        food_data = {
            "foodName": foodName,
            "quantity": quantity,
            "category": category,
            "dietaryInfo": dietaryInfo,
            "pickupLocation": pickupLocation,
            "pickupTime": pickupTime,
            "photo": photo,
            "status": "green",  # Assuming all posts are available by default 
            "postedBy": user,
            "reportCount": 0,
            "timestamp": db.command("serverStatus")["localTime"],
            "reservedBy": "None",
            "expirationTime": expirationTime,
        }

        result = food_collection.insert_one(food_data)
        return {"message": "Food post created successfully", "food_id": str(result.inserted_id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/food")
async def get_food():
    try:
        # Fetch all food items from the database
        food_posts = list(food_collection.find({}))

        # Process each food item
        for food in food_posts:
            food["id"] = str(food["_id"])  # Add an "id" field with the string version of "_id"
            del food["_id"]  # Remove the original "_id" field

            # Extract the Base64 string from the photo field
            if "photo" in food and isinstance(food["photo"], str):
                try:
                    # Parse the photo JSON string
                    import json
                    photo_data = json.loads(food["photo"])
                    food["photo"] = photo_data.get("uri", "")  # Extract the Base64 string from the "uri" key
                except json.JSONDecodeError:
                    food["photo"] = ""  # If parsing fails, set photo to an empty string

        return {"food_posts": food_posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    

@app.post("/api/food/reserve")
async def reserve_food(payload: dict = Body(...)):
    try:
        # Extract food_id and user from the JSON payload
        food_id = payload.get("food_id")
        user = payload.get("user")

        if not food_id or not user:
            raise HTTPException(status_code=400, detail="food_id and user are required")

        # Check if the food item exists
        food_item = food_collection.find_one({"_id": ObjectId(food_id)})
        if not food_item:
            raise HTTPException(status_code=404, detail="Food item not found")

        # Check if the food item is already reserved
        if food_item.get("status") == "reserved":
            raise HTTPException(status_code=400, detail="Food item is already reserved")

        # Update the food item's status and reservedBy field
        result = food_collection.update_one(
            {"_id": ObjectId(food_id)},
            {"$set": {"status": "yellow", "reservedBy": user}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to reserve the food item")

        return {"message": "Food item reserved successfully", "food_id": food_id, "reservedBy": user}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/food/complete")
async def complete_transaction(food_id: str = Form(...), user: str = Form(...)):
    try:
        # Check if the food item exists
        food_item = food_collection.find_one({"_id": ObjectId(food_id)})
        if not food_item:
            raise HTTPException(status_code=404, detail="Food item not found")

        # Check if the food item is reserved by the same user
        if food_item.get("reservedBy") != user:
            raise HTTPException(status_code=403, detail="You are not authorized to complete this transaction")

        # Update the food item's status to "red"
        result = food_collection.update_one(
            {"_id": ObjectId(food_id)},
            {"$set": {"status": "red"}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to complete the transaction")

        return {"message": "Transaction completed successfully", "food_id": food_id, "status": "red"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create Pydantic models for the report
class ReportBase(BaseModel):
    postId: str  # Changed from int to str to match MongoDB ObjectId
    message: str
    createdId: int
    isSubmitted: bool = True

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: Optional[str] = None  # MongoDB _id as string
    submittedAt: datetime
    reviewStatus: str = "pending"
    reviewedBy: Optional[str] = None
    
    class Config:
        orm_mode = True
        # Allow extra fields from MongoDB
        extra = "allow"

# Create a new collection for reports
report_collection = db.reports

@app.post("/api/report")
async def submit_report(postId: str = Form(...), message: str = Form(...), user1Id: int = Form(...), user2Id: int = Form(...)):
    try:
        print(f"Received report: postId={postId}, message={message}, user1Id={user1Id}, user2Id={user2Id}")  # Debug log

        food_post = food_collection.find_one({"_id": ObjectId(postId)})
        if not food_post:
            print("Food post not found!")  # Debug log
            raise HTTPException(status_code=404, detail="Food post not found")

        report_data = {
            "postId": postId,
            "user1ID": user1Id,
            "user2ID":user2Id,
            "message": message,
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None,
        }

        print("Inserting report into database:", report_data)  # Debug log
        result = report_collection.insert_one(report_data)
        print(f"Report inserted with ID: {result.inserted_id}")  # Debug log

        update_result = food_collection.update_one(
            {"_id": ObjectId(postId)},
            {"$inc": {"reportCount": 1}}
        )
        print(f"Updated food post report count: {update_result.modified_count} document(s) modified")  # Debug log

        return {"message": "Report submitted successfully", "report_id": str(result.inserted_id)}

    except Exception as e:
        print(f"Error in submit_report: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports", response_model=List[Report])
async def get_reports():
    try:
        reports = list(report_collection.find())

        # Convert ObjectId to string
        for report in reports:
            report["id"] = str(report["_id"])
            del report["_id"]  # Remove original ObjectId to avoid serialization errors

        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/report/{report_id}")
async def update_report_status(report_id: str, status: str = Form(...), admin_id: str = Form(...)):
    try:
        report_collection.update_one(
            {"_id": report_id},
            {"$set": {"reviewStatus": status, "reviewedBy": admin_id}}
        )
        return {"message": "Report status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/test-report")
async def test_report():
    try:
        # Create a test report
        test_report = {
            "postId": "test_post_id",
            "message": "This is a test report",
            "createdId": 999,
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None
        }
        
        # Insert the test report
        result = report_collection.insert_one(test_report)
        
        # Verify it was inserted
        inserted_report = report_collection.find_one({"_id": result.inserted_id})
        
        return {
            "success": True,
            "report_id": str(result.inserted_id),
            "inserted_report": {
                **{k: v for k, v in inserted_report.items() if k != "_id"},
                "id": str(inserted_report["_id"])
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
@app.get("/api/food/search")
async def search_food(
   foodName: Optional[str] = None,
   category: Optional[str] = None,
   pickupLocation: Optional[str] = None,
   pickupTime: Optional[str] = None,
):
   try:
       query = {}
       if foodName:
           query["foodName"] = {"$regex": foodName, "$options": "i"}
       if category:
           query["category"] = {"$regex": category, "$options": "i"}
       if pickupLocation:
           query["pickupLocation"] = {"$regex": pickupLocation, "$options": "i"}
       if pickupTime:
           query["pickupTime"] = {"$regex": pickupTime, "$options": "i"}


       food_posts = list(food_collection.find(query, {"_id": 0}))
       return {"food_posts": food_posts}
   except Exception as e:
       raise HTTPException(status_code=500, detail=str(e))