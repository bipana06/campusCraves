from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import shutil
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow CORS from specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],  # Add your frontend URL here
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# MongoDB Connection
client = MongoClient(os.getenv("MONGO_URI"),  tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=50000, socketTimeoutMS=50000)  # 30 seconds socket timeout)
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
    photo: str = Form(...),  # Now expect the photo as a string (file path)
):
    try:
        # Ensure all required fields are provided
        if not all([foodName, quantity, category, pickupLocation, pickupTime, photo]):
            raise HTTPException(status_code=400, detail="All required fields must be filled")

        # You can skip file handling as you're just receiving the file path as a string
        photo_path = photo  # Assuming 'photo' is the path passed from frontend

        # Prepare the data to be inserted into the database
        food_data = {
            "foodName": foodName,
            "quantity": quantity,
            "category": category,
            "dietaryInfo": dietaryInfo,
            "pickupLocation": pickupLocation,
            "pickupTime": pickupTime,
            "photo": photo_path,  # Store the file path (string)
            "createdAt": db.command("serverStatus")["localTime"]
        }

        # Insert the data into the MongoDB collection
        result = food_collection.insert_one(food_data)

        return {"message": "Food post created successfully", "food_id": str(result.inserted_id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
