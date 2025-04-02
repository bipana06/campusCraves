from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv("MONGO_URI"), tls=True, tlsAllowInvalidCertificates=True)
db = client.food_db  # Replace with your database name

# Collections to clear
collections_to_clear = ["food_posts", "reports", "users" ]

try:
    # Iterate through each collection and delete all documents
    for collection_name in collections_to_clear:
        collection = db[collection_name]
        result = collection.delete_many({})  # Delete all documents
        print(f"Deleted {result.deleted_count} documents from the '{collection_name}' collection.")

    print("All specified collections have been cleared.")
except Exception as e:
    print(f"Error while clearing collections: {str(e)}")
finally:
    # Close the MongoDB connection
    client.close()