from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Replace with your MongoDB Atlas connection string
uri = ""

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print("Connection failed:", e)
    exit()  # Exit if the connection fails

# Select your database and collection
db = client["database"]  # Replace with your actual database name
collection = db["test"]  # Replace with your actual collection name

# Define the new document to insert
new_document = {
    "name": "Bipana Bastola",
    "email": "john@xyz.com",
    "age": 30,
    "hobbies": ["coding", "traveling", "reading"]
}

# Insert the document into the collection
inserted_id = collection.insert_one(new_document).inserted_id

print(f"New document inserted with _id: {inserted_id}")



print("something new")