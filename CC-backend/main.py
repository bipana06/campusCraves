from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

load_dotenv()

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
async def reserve_food(food_id: str = Form(...), user: str = Form(...)):
    try:
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