import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

client = None
db = None
food_collection = None
report_collection = None
users_collection = None

def connect_db():
    global client, db, food_collection, report_collection, users_collection
    try:
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            logger.error("MONGO_URI environment variable not set.")
            raise ValueError("MONGO_URI environment variable not set.")

        client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
        db = client.food_db # Or getenv("MONGO_DB_NAME", "food_db")
        food_collection = db.food_posts
        report_collection = db.reports
        users_collection = db.users

        # Test connection and ensure collections exist
        db_info = client.server_info()
        logger.info(f"Successfully connected to MongoDB: {db_info['version']}")
        collections = db.list_collection_names()
        logger.info(f"Available collections: {collections}")

        required_collections = {"food_posts", "reports", "users"}
        for coll_name in required_collections:
             if coll_name not in collections:
                 db.create_collection(coll_name)
                 logger.info(f"Created '{coll_name}' collection")

        logger.info(f"Using food_collection: {food_collection.name}")
        logger.info(f"Using report_collection: {report_collection.name}")
        logger.info(f"Using users_collection: {users_collection.name}")
        logger.info(f"users_collection initialized: {users_collection}")

    except Exception as e:
        logger.error(f"MongoDB connection error: {str(e)}", exc_info=True)
        # Depending on application needs, you might want to exit or handle differently
        raise RuntimeError(f"Failed to connect to MongoDB: {e}") from e

def get_food_collection():
    if food_collection is None:
        connect_db() # Ensure DB is connected
    return food_collection

def get_report_collection():
    if report_collection is None:
        connect_db()
    return report_collection

def get_users_collection():
    if users_collection is None:
        connect_db()
    return users_collection
