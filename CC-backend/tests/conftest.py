import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import time
import json
import sys


# --- Environment Setup ---
load_dotenv()

# --- Path Setup ---
# Add the project root directory to the Python path
# This allows imports like 'from main import app' or 'from database import ...'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# --- App Import ---
# Now import application components after setting the path
try:
    from main import app
    from database import (
        food_collection,
        report_collection,
        users_collection,
        get_food_collection,
        get_report_collection,
        get_users_collection,
        connect_db, # Import connect_db for potential direct use/testing
        client as db_client # Rename imported client to avoid conflict
    )
    from utils import hash_password
except ImportError as e:
    print(f"Error importing application components: {e}")
    print(f"Ensure the test directory structure is correct and project root is in sys.path: {project_root}")
    sys.exit(1) # Exit if core components can't be imported

# --- Test Client Fixture ---
@pytest.fixture(scope="session") # Use session scope for the client
def client():
    """Provides a TestClient instance for the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client

# --- Helper Variables ---
# Unique identifiers for test runs
RUN_ID = int(time.time())
TEST_USER_GOOGLE_ID = f"test_google_id_{RUN_ID}"
TEST_USER_NET_ID = f"test_netid_{RUN_ID}"
TEST_USER_EMAIL = f"{TEST_USER_NET_ID}@example.com"
TEST_USER_FULL_NAME = "Test User"
TEST_USER_USERNAME = f"testuser_{RUN_ID}"
TEST_USER_PASSWORD = "testpassword123"
TEST_USER_HASHED_PASSWORD = hash_password(TEST_USER_PASSWORD) # Pre-hash for direct insertion

OTHER_USER_GOOGLE_ID = f"other_google_id_{RUN_ID}"
OTHER_USER_NET_ID = f"other_netid_{RUN_ID}"
OTHER_USER_EMAIL = f"{OTHER_USER_NET_ID}@example.com"
OTHER_USER_FULL_NAME = "Other User"
OTHER_USER_USERNAME = f"otheruser_{RUN_ID}"
OTHER_USER_PASSWORD = "otherpassword456"
OTHER_USER_HASHED_PASSWORD = hash_password(OTHER_USER_PASSWORD)

# --- Helper Functions ---

def cleanup_test_data():
    """Removes data created during tests based on RUN_ID"""
    print(f"\n--- Cleaning up test data for RUN_ID: {RUN_ID} ---")
    if users_collection is None or food_collection is None or report_collection is None:
        print("--- DB Collections not initialized, skipping cleanup ---")
        return

    try:
        # Delete users based on unique fields from this run
        users_del_result = users_collection.delete_many({"netId": {"$regex": f"_{RUN_ID}$"}})
        print(f"Users deleted: {users_del_result.deleted_count}")
        # Delete food posts by users from this run
        food_del_result = food_collection.delete_many({"postedBy": {"$regex": f"_{RUN_ID}$"}})
        print(f"Food posts deleted: {food_del_result.deleted_count}")
        # Delete reports involving users from this run
        report_del_result = report_collection.delete_many({"user1ID": {"$regex": f"_{RUN_ID}$"}})
        print(f"Reports deleted: {report_del_result.deleted_count}")
        # Delete specific test reports
        test_report_del = report_collection.delete_many({"message": {"$regex": "^This is a test report"}})
        print(f"Test reports deleted: {test_report_del.deleted_count}")

    except Exception as e:
        print(f"--- Error during cleanup: {e} ---")
    print("--- Cleanup complete ---")

def _create_user_direct(net_id, email, username, hashed_password, google_id, full_name):
    """Helper to directly insert a user into the DB, bypassing API for setup speed."""
    print(f"Ensuring user exists in DB: {net_id}")
    users_collection = get_users_collection()
    if users_collection is None:
        raise RuntimeError("Users collection not initialized.")
    user_data = {
        "googleId": google_id,
        "netId": net_id,
        "email": email,
        "username": username,
        "password": hashed_password,
        "fullName": full_name,
        "phoneNumber": "1234567890",
        "picture": "default.png",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
        "role": "user",
        "postCount": 0,
        "reservationCount": 0,
        "lastLogin": None
    }
    # Use update_one with upsert=True to avoid duplicate errors during setup
    users_collection.update_one(
        {"netId": net_id},
        {"$set": user_data},
        upsert=True
    )
    print(f"Ensured user exists in DB: {net_id}")


# --- Setup/Teardown Fixture ---
@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown_session():
    """Connects DB, creates base test users, yields, then cleans up."""
    print("\n--- Session Setup: Connecting DB and Creating Base Users ---")
    try:
        # Ensure DB is connected (idempotent)
        connect_db()
    
        # Create base users directly in DB for test setup
        _create_user_direct(TEST_USER_NET_ID, TEST_USER_EMAIL, TEST_USER_USERNAME, TEST_USER_HASHED_PASSWORD, TEST_USER_GOOGLE_ID, TEST_USER_FULL_NAME)
        _create_user_direct(OTHER_USER_NET_ID, OTHER_USER_EMAIL, OTHER_USER_USERNAME, OTHER_USER_HASHED_PASSWORD, OTHER_USER_GOOGLE_ID, OTHER_USER_FULL_NAME)
    except Exception as e:
        print(f"FATAL: Error during session setup: {e}")
        pytest.exit(f"Failed session setup: {e}", 1)

    yield # Tests run here

    print("\n--- Session Teardown: Cleaning DB ---")
    cleanup_test_data()
    if db_client:
        db_client.close()
        print("MongoDB connection closed.")


# --- User Fixtures ---
@pytest.fixture(scope="session")
def test_user_data():
    """Provides TEST_USER details."""
    return {"googleId": TEST_USER_GOOGLE_ID, "netId": TEST_USER_NET_ID, "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD, "username": TEST_USER_USERNAME, "fullName": TEST_USER_FULL_NAME}

@pytest.fixture(scope="session")
def other_user_data():
    """Provides OTHER_USER details."""
    return {"googleId": OTHER_USER_GOOGLE_ID, "netId": OTHER_USER_NET_ID, "email": OTHER_USER_EMAIL, "password": OTHER_USER_PASSWORD, "username": OTHER_USER_USERNAME, "fullName": OTHER_USER_FULL_NAME}


# --- Food Post Fixtures ---
@pytest.fixture(scope="function") # Use function scope if tests modify the post state
def available_food_post(client, test_user_data):
    """Fixture to create an available food item posted by TEST_USER."""
    data = {
        "foodName": f"Available Pizza {RUN_ID} {time.time()}", "quantity": 1, "category": "Meal",
        "dietaryInfo": "None", "pickupLocation": "Somewhere",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/jpeg;base64,/9j/valid..."}),
        "user": test_user_data["netId"],
        "expirationTime": (datetime.now() + timedelta(hours=4)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
    assert response.status_code == 200, f"Failed to create available_food_post: {response.text}"
    food_id = response.json()["food_id"]
    # Yield ID and poster's netId
    yield {"id": food_id, "posterNetId": test_user_data["netId"]}
    # Optional: Cleanup this specific post if function scope is needed
    # food_collection.delete_one({"_id": ObjectId(food_id)})

@pytest.fixture(scope="function")
def reserved_food_post(client, available_food_post, other_user_data):
    """Fixture to create a reserved food item (reserved by OTHER_USER)."""
    food_id = available_food_post["id"]
    reserver_net_id = other_user_data["netId"]
    payload = {"food_id": food_id, "user": reserver_net_id}
    response = client.post("/api/food/reserve", json=payload)
    assert response.status_code == 200, f"Failed to reserve food post in fixture: {response.text}"
    yield {"id": food_id, "posterNetId": available_food_post["posterNetId"], "reserverNetId": reserver_net_id}

@pytest.fixture(scope="function")
def completed_food_post(client, reserved_food_post):
    """Fixture to create a completed food item."""
    food_id = reserved_food_post["id"]
    reserver_net_id = reserved_food_post["reserverNetId"]
    payload = {"food_id": food_id, "user": reserver_net_id}
    response = client.post("/api/food/complete", data=payload)
    assert response.status_code == 200, f"Failed to complete food post in fixture: {response.text}"
    yield {"id": food_id, "posterNetId": reserved_food_post["posterNetId"], "reserverNetId": reserver_net_id}


# --- Report Fixture ---
@pytest.fixture(scope="function")
def reported_food_post(client, available_food_post, other_user_data):
    """Fixture to create a food post and report it."""
    food_id = available_food_post["id"]
    reporter_net_id = other_user_data["netId"]
    poster_net_id = available_food_post["posterNetId"] # Should be TEST_USER
    payload = {
        "postId": food_id,
        "message": f"Fixture report message {time.time()}",
        "user1Id": reporter_net_id, # Reporter
        "user2Id": poster_net_id, # Poster being reported
    }
    response = client.post("/api/report", data=payload)
    assert response.status_code == 200, f"Failed to submit report in fixture: {response.text}"
    report_id = response.json()["report_id"]
    yield {"foodId": food_id, "reportId": report_id, "reporterNetId": reporter_net_id, "posterNetId": poster_net_id}
