import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime
import time
import json
# Add imports for timedelta if not already present
from datetime import timedelta
# Load environment variables for DB connection (if needed for testing)
# Ensure your test environment has access to MONGO_URI or mock the DB connection
load_dotenv()

# Assuming your FastAPI app instance is named 'app' in 'main.py'
# If your file is named differently, adjust the import
try:
    from .main import app, food_collection, report_collection, users_collection
except ImportError:
    from main import app, food_collection, report_collection, users_collection # Fallback if running directly

client = TestClient(app)

# --- Helper Variables/Functions ---
# Use dynamic values or clear DB before tests for consistency
TEST_USER_GOOGLE_ID = f"test_google_id_{int(time.time())}"
TEST_USER_NET_ID = f"test_netid_{int(time.time())}"
TEST_USER_EMAIL = f"{TEST_USER_NET_ID}@example.com"
TEST_USER_FULL_NAME = "Test User"

OTHER_USER_GOOGLE_ID = f"other_google_id_{int(time.time())}"
OTHER_USER_NET_ID = f"other_netid_{int(time.time())}"
OTHER_USER_EMAIL = f"{OTHER_USER_NET_ID}@example.com"
OTHER_USER_FULL_NAME = "Other User"

# Clean up function (optional, depends on testing strategy)
def cleanup_test_data():
    print("\n--- Cleaning up test data ---")
    # Be CAREFUL with delete_many({}) in production DBs!
    # Use specific filters for test data
    users_collection.delete_many({"googleId": {"$regex": "^test_google_id_"}})
    users_collection.delete_many({"googleId": {"$regex": "^other_google_id_"}})
    users_collection.delete_many({"netId": {"$regex": "^test_netid_"}})
    users_collection.delete_many({"netId": {"$regex": "^other_netid_"}})
    food_collection.delete_many({"postedBy": {"$regex": "^test_netid_"}})
    food_collection.delete_many({"postedBy": {"$regex": "^other_netid_"}})
    report_collection.delete_many({"user1ID": {"$regex": "^test_netid_"}})
    report_collection.delete_many({"user1ID": {"$regex": "^other_netid_"}})
    print("--- Cleanup complete ---")

# --- Pytest Fixture for Setup/Teardown ---
@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    # Setup: Ensure test users exist for certain tests
    _register_user(TEST_USER_GOOGLE_ID, TEST_USER_NET_ID, TEST_USER_EMAIL, TEST_USER_FULL_NAME)
    _register_user(OTHER_USER_GOOGLE_ID, OTHER_USER_NET_ID, OTHER_USER_EMAIL, OTHER_USER_FULL_NAME)
    yield # This is where the tests run
    # Teardown: Clean up test data
    cleanup_test_data()


def _register_user(google_id, net_id, email, full_name):
    """Helper to register a user, ignoring conflicts if already exists."""
    user_data = {
        "googleId": google_id,
        "email": email,
        "netId": net_id,
        "fullName": full_name,
        "phoneNumber": "1234567890",
        "picture": "pic_url"
    }
    # Use check first to avoid raising exceptions during setup
    existing = users_collection.find_one({"$or": [{"googleId": google_id}, {"netId": net_id}]})
    if not existing:
        response = client.post("/api/users/register", json=user_data)
        print(f"Registering {net_id}: Status {response.status_code}")
    else:
         print(f"User {net_id} already exists.")


# --- Test Functions ---

# == /api/food (POST) ==

def test_post_food_success():
    # Use the globally defined test user's netId
    data = {
        "foodName": "Test Apple Pie",
        "quantity": 1, # Form expects int, send as int or string that converts
        "category": "Dessert",
        "dietaryInfo": "Contains gluten, dairy",
        "pickupLocation": "NYUAD C1",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/jpeg;base64,/9j/4AAQSkZ..."}), # Example valid JSON string
        "user": TEST_USER_NET_ID, # Use the netId of the registered test user
        "expirationTime": (datetime.now() + timedelta(hours=2)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data={k: str(v) for k, v in data.items()}) # Send as form data
    print(f"POST /api/food Success: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_id" in json_response
    assert json_response["message"] == "Food post created successfully"
    # Store the created food_id for potential use in other tests
    pytest.created_food_id = json_response["food_id"]

def test_post_food_missing_required_field():
    # Missing 'foodName'
    data = {
       # "foodName": "Test Missing Pie", # Field missing
        "quantity": "1",
        "category": "Dessert",
        "dietaryInfo": "None",
        "pickupLocation": "NYUAD C2",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/png;base64,iVBORw0KGgo..."}),
        "user": TEST_USER_NET_ID,
        "expirationTime": (datetime.now() + timedelta(hours=3)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data=data)
    print(f"POST /api/food Missing Field: Status {response.status_code}, Response: {response.text}")
    # FastAPI's Form(...) validation triggers this
    assert response.status_code == 422
    assert "Field required" in response.json()["detail"][0]["msg"]

def test_post_food_invalid_quantity_type():
    # Send quantity as non-integer string
    data = {
        "foodName": "Test Bad Quantity Pie",
        "quantity": "abc", # Invalid integer
        "category": "Dessert",
        "dietaryInfo": "None",
        "pickupLocation": "NYUAD C3",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/gif;base64,R0lGODlhAQABAIAAAA..."}),
        "user": TEST_USER_NET_ID,
        "expirationTime": (datetime.now() + timedelta(hours=1)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data=data)
    print(f"POST /api/food Invalid Type: Status {response.status_code}, Response: {response.text}")
    # FastAPI's type validation triggers this
    assert response.status_code == 422
    assert "Input should be a valid integer, unable to parse string as an integer" in response.json()["detail"][0]["msg"]

# == /api/food (GET) ==

def test_get_food_success():
    # Assumes at least one food item exists (e.g., from test_post_food_success)
    response = client.get("/api/food")
    print(f"GET /api/food Success: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert isinstance(json_response["food_posts"], list)
    if json_response["food_posts"]:
        # Check structure of the first item if list is not empty
        first_item = json_response["food_posts"][0]
        assert "id" in first_item
        assert "_id" not in first_item
        assert "foodName" in first_item
        assert "photo" in first_item # Check photo is processed
        # Example check photo content:
        assert isinstance(first_item["photo"], str)
        assert first_item["photo"].startswith("data:image") or first_item["photo"] == ""


def test_get_food_empty():
    # This test is more reliable if you can clear the food collection first
    # Or if run before any posts are made in the test suite
    # For now, just check the structure even if it might return items
    response = client.get("/api/food")
    print(f"GET /api/food Empty Check: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert isinstance(json_response["food_posts"], list)

# == /api/food/reserve (POST) ==

@pytest.fixture
def available_food_id():
    """Fixture to create an available food item for reservation tests"""
    data = {
        "foodName": "Reservable Pizza", "quantity": 1, "category": "Meal",
        "dietaryInfo": "None", "pickupLocation": "Somewhere",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/jpeg;base64,/9j/valid..."}),
        "user": TEST_USER_NET_ID,
        "expirationTime": (datetime.now() + timedelta(hours=4)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
    assert response.status_code == 200
    return response.json()["food_id"]

def test_reserve_food_success(available_food_id):
    payload = {
        "food_id": available_food_id,
        "user": OTHER_USER_NET_ID # Different user reserves
    }
    response = client.post("/api/food/reserve", json=payload)
    print(f"POST /api/food/reserve Success: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["message"] == "Food item reserved successfully"
    assert json_response["food_id"] == available_food_id
    assert json_response["reservedBy"] == OTHER_USER_NET_ID
    # Check DB status (optional but good)
    item = food_collection.find_one({"_id": ObjectId(available_food_id)})
    assert item["status"] == "yellow"
    assert item["reservedBy"] == OTHER_USER_NET_ID
    pytest.reserved_food_id = available_food_id # Save for completion test
    pytest.reserver_user_net_id = OTHER_USER_NET_ID

def test_reserve_food_not_found():
    payload = {
        "food_id": str(ObjectId()), # Random, non-existent ID
        "user": OTHER_USER_NET_ID
    }
    response = client.post("/api/food/reserve", json=payload)
    print(f"POST /api/food/reserve Not Found: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food item not found"

def test_reserve_food_already_reserved(available_food_id):
    # First reservation
    payload1 = {"food_id": available_food_id, "user": OTHER_USER_NET_ID}
    client.post("/api/food/reserve", json=payload1) # Ignore response, just reserve it

    # Attempt second reservation
    payload2 = {"food_id": available_food_id, "user": TEST_USER_NET_ID} # Different user tries
    response = client.post("/api/food/reserve", json=payload2)
    print(f"POST /api/food/reserve Already Reserved: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Food item is already reserved"

def test_reserve_food_missing_data():
    payload = {"food_id": "some_id"} # Missing 'user'
    response = client.post("/api/food/reserve", json=payload)
    print(f"POST /api/food/reserve Missing Data: Status {response.status_code}, Response: {response.text}")
    # The endpoint code explicitly checks for food_id and user
    assert response.status_code == 400
    assert response.json()["detail"] == "food_id and user are required"

    payload = {"user": TEST_USER_NET_ID} # Missing 'food_id'
    response = client.post("/api/food/reserve", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "food_id and user are required"

# == /api/food/complete (POST) ==

def test_complete_transaction_success():
    # Requires a reserved item from a previous test (e.g., test_reserve_food_success)
    assert hasattr(pytest, 'reserved_food_id'), "Reserved food ID not set"
    assert hasattr(pytest, 'reserver_user_net_id'), "Reserver user not set"

    payload = {
        "food_id": pytest.reserved_food_id,
        "user": pytest.reserver_user_net_id # The user who actually reserved it
    }
    response = client.post("/api/food/complete", data=payload) # Send as form data
    print(f"POST /api/food/complete Success: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["message"] == "Transaction completed successfully"
    assert json_response["food_id"] == pytest.reserved_food_id
    assert json_response["status"] == "red"
     # Check DB status (optional but good)
    item = food_collection.find_one({"_id": ObjectId(pytest.reserved_food_id)})
    assert item["status"] == "red"


def test_complete_transaction_not_found():
    payload = {
        "food_id": str(ObjectId()), # Random, non-existent ID
        "user": TEST_USER_NET_ID
    }
    response = client.post("/api/food/complete", data=payload)
    print(f"POST /api/food/complete Not Found: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food item not found"

def test_complete_transaction_not_authorized(available_food_id):
    # Reserve item first with OTHER_USER
    client.post("/api/food/reserve", json={"food_id": available_food_id, "user": OTHER_USER_NET_ID})

    # Attempt completion with TEST_USER (who didn't reserve it)
    payload = {
        "food_id": available_food_id,
        "user": TEST_USER_NET_ID
    }
    response = client.post("/api/food/complete", data=payload)
    print(f"POST /api/food/complete Not Authorized: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 403
    assert response.json()["detail"] == "You are not authorized to complete this transaction"

# def test_complete_transaction_not_reserved(available_food_id):
#     # Use an available (green) item ID that hasn't been reserved
#     payload = {
#         "food_id": available_food_id,
#         "user": TEST_USER_NET_ID # Doesn't matter who tries if not reserved
#     }
#     response = client.post("/api/food/complete", data=payload)
#     print(f"POST /api/food/complete Not Reserved: Status {response.status_code}, Response: {response.text}")
#     # The check `food_item.get("reservedBy") != user` will fail if reservedBy is None or "None"
#     assert response.status_code == 403
#     assert response.json()["detail"] == "You are not authorized to complete this transaction"

# == /api/report (POST) ==

@pytest.fixture
def post_for_reporting():
    """Fixture to create a food post owned by TEST_USER for reporting tests"""
    data = {
        "foodName": "Reportable Item", "quantity": 1, "category": "Snack",
        "dietaryInfo": "Allergen-free", "pickupLocation": "Lab",
        "pickupTime": datetime.now().isoformat(),
        "photo": json.dumps({"uri": "data:image/gif;base64,R0lGODlhAQABAAAAAC..."}),
        "user": TEST_USER_NET_ID, # Posted by TEST_USER
        "expirationTime": (datetime.now() + timedelta(hours=1)).isoformat(),
        "createdAt": datetime.now().isoformat(),
    }
    response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
    assert response.status_code == 200
    return response.json()["food_id"]


def test_submit_report_success(post_for_reporting):
    # OTHER_USER reports the post made by TEST_USER
    payload = {
        "postId": post_for_reporting,
        "message": "The item was not as described.",
        "user1Id": OTHER_USER_NET_ID, # Reporter
        "user2Id": TEST_USER_NET_ID, # Poster
    }
    # Get initial report count
    item_before = food_collection.find_one({"_id": ObjectId(post_for_reporting)})
    initial_report_count = item_before.get("reportCount", 0) if item_before else 0

    response = client.post("/api/report", data=payload)
    print(f"POST /api/report Success: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["message"] == "Report submitted successfully"
    assert "report_id" in json_response

    # Verify report count incremented
    item_after = food_collection.find_one({"_id": ObjectId(post_for_reporting)})
    assert item_after is not None
    assert item_after.get("reportCount", 0) == initial_report_count + 1

    # Store report_id for later tests
    pytest.created_report_id = json_response["report_id"]

def test_submit_report_post_not_found():
    payload = {
        "postId": str(ObjectId()), # Non-existent post ID
        "message": "This post doesn't exist.",
        "user1Id": OTHER_USER_NET_ID,
        "user2Id": TEST_USER_NET_ID,
    }
    response = client.post("/api/report", data=payload)
    print(f"POST /api/report Post Not Found: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food post not found"

def test_submit_report_missing_data(post_for_reporting):
    payload = {
        "postId": post_for_reporting,
       # "message": "Missing message", # Message missing
        "user1Id": OTHER_USER_NET_ID,
        "user2Id": TEST_USER_NET_ID,
    }
    response = client.post("/api/report", data=payload)
    print(f"POST /api/report Missing Data: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 422 # FastAPI Form validation

# == /api/reports (GET) ==

# def test_get_reports_success():
#     # Assumes at least one report exists (e.g., from test_submit_report_success)
#     response = client.get("/api/reports")
#     print(f"GET /api/reports Success: Status {response.status_code}")
#     assert response.status_code == 200
#     json_response = response.json()
#     assert isinstance(json_response, list)
#     if json_response:
#         first_report = json_response[0]
#         assert "id" in first_report
#         assert "_id" not in first_report
#         assert "postId" in first_report
#         assert "message" in first_report
#         assert "reviewStatus" in first_report

# == /api/report/{report_id} (PUT) ==

def test_update_report_status_success():
    # Requires a report_id from a previous test
    assert hasattr(pytest, 'created_report_id'), "Report ID not set for update test"
    report_id = pytest.created_report_id
    admin_id = "admin_user_001" # Example admin identifier
    payload = {
        "status": "resolved",
        "admin_id": admin_id
    }
    response = client.put(f"/api/report/{report_id}", data=payload)
    print(f"PUT /api/report/{report_id} Success: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    assert response.json()["message"] == "Report status updated successfully"

 

def test_update_report_status_missing_data():
    # Requires a report_id
    assert hasattr(pytest, 'created_report_id'), "Report ID not set for update test"
    report_id = pytest.created_report_id
    payload = {
       # "status": "reviewed", # Status missing
        "admin_id": "admin_002"
    }
    response = client.put(f"/api/report/{report_id}", data=payload)
    print(f"PUT /api/report/{report_id} Missing Data: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 422 # FastAPI Form validation

# == /api/test-report (GET) ==

def test_get_test_report_endpoint():
    # This endpoint directly inserts a test report
    response = client.get("/api/test-report")
    print(f"GET /api/test-report: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["success"] is True
    assert "report_id" in json_response
    assert "inserted_report" in json_response
    assert json_response["inserted_report"]["message"] == "This is a test report"
    # Clean up the created test report
    report_collection.delete_one({"_id": ObjectId(json_response["report_id"])})


# == /api/food/search (GET) ==
# Assumes some food items exist from previous tests

def test_search_food_by_name():
    # Assuming 'Test Apple Pie' was created
    params = {"foodName": "Apple Pie"}
    response = client.get("/api/food/search", params=params)
    print(f"GET /api/food/search by Name: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert isinstance(json_response["food_posts"], list)
    assert len(json_response["food_posts"]) > 0 # Expecting at least one match
    assert "Apple Pie" in json_response["food_posts"][0]["foodName"]
    assert "id" in json_response["food_posts"][0] # Check ID format


def test_search_food_by_category():
    params = {"category": "Dessert"} # Assuming 'Test Apple Pie' category
    response = client.get("/api/food/search", params=params)
    print(f"GET /api/food/search by Category: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert len(json_response["food_posts"]) > 0
    assert json_response["food_posts"][0]["category"] == "Dessert"

def test_search_food_by_location():
    params = {"pickupLocation": "NYUAD C1"} # From test_post_food_success
    response = client.get("/api/food/search", params=params)
    print(f"GET /api/food/search by Location: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert len(json_response["food_posts"]) > 0
    assert json_response["food_posts"][0]["pickupLocation"] == "NYUAD C1"

def test_search_food_multiple_criteria():
    params = {"foodName": "Apple", "category": "Dessert"}
    response = client.get("/api/food/search", params=params)
    print(f"GET /api/food/search Multiple Criteria: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert len(json_response["food_posts"]) > 0 # Expecting 'Test Apple Pie'
    assert "Apple Pie" in json_response["food_posts"][0]["foodName"]
    assert json_response["food_posts"][0]["category"] == "Dessert"

def test_search_food_no_results():
    params = {"foodName": "NonExistentFoodItemXYZ"}
    response = client.get("/api/food/search", params=params)
    print(f"GET /api/food/search No Results: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "food_posts" in json_response
    assert isinstance(json_response["food_posts"], list)
    assert len(json_response["food_posts"]) == 0

def test_search_food_no_criteria():
    # Should return all food items, similar to GET /api/food
    response_search = client.get("/api/food/search")
    response_get = client.get("/api/food")
    print(f"GET /api/food/search No Criteria: Status {response_search.status_code}")
    assert response_search.status_code == 200
    assert response_get.status_code == 200
    # Check if number of results match (can be flaky if tests run in parallel/modify DB)
    # assert len(response_search.json()["food_posts"]) == len(response_get.json()["food_posts"])
    assert "food_posts" in response_search.json()

# == /api/users/register (POST) ==
# Note: User registration is also used in setup fixtures

def test_register_user_success_new():
    # Use unique IDs for this specific test
    unique_google_id = f"test_google_id_reg_{int(time.time())}"
    unique_net_id = f"test_netid_reg_{int(time.time())}"
    payload = {
        "googleId": unique_google_id,
        "email": f"{unique_net_id}@example.com",
        "netId": unique_net_id,
        "fullName": "Register Test User",
        "phoneNumber": "5551234",
        "picture": "some_url"
    }
    response = client.post("/api/users/register", json=payload)
    print(f"POST /api/users/register New: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["success"] is True
    assert json_response["message"] == "User registered successfully"
    # Cleanup this specific user
    users_collection.delete_one({"googleId": unique_google_id})

def test_register_user_success_update():
    # Uses the TEST_USER created in setup
    payload = {
        "googleId": TEST_USER_GOOGLE_ID,
        "email": TEST_USER_EMAIL, # Email might not be updated in the endpoint logic
        "netId": TEST_USER_NET_ID, # NetID should match existing
        "fullName": "Test User Updated Name", # Update full name
        "phoneNumber": "9876543210", # Update phone
        "picture": "new_pic_url"
    }
    response = client.post("/api/users/register", json=payload)
    print(f"POST /api/users/register Update: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["success"] is True
    assert json_response["message"] == "User updated successfully"
    # Verify update (optional but good)
    user = users_collection.find_one({"googleId": TEST_USER_GOOGLE_ID})
    assert user["fullName"] == "Test User Updated Name"
    assert user["phoneNumber"] == "9876543210"


def test_register_user_conflict_netid():
    # Try registering a new googleId with an existing netId (TEST_USER_NET_ID)
    unique_google_id = f"test_google_id_conflict_{int(time.time())}"
    payload = {
        "googleId": unique_google_id,
        "email": f"conflict@example.com",
        "netId": TEST_USER_NET_ID, # Existing Net ID
        "fullName": "Conflict User",
    }
    response = client.post("/api/users/register", json=payload)
    print(f"POST /api/users/register Conflict NetID: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 409 # Conflict
    assert response.json()["detail"] == "This Net ID is already registered"

def test_register_user_missing_required_field():
    payload = {
        "googleId": f"test_google_id_missing_{int(time.time())}",
        "email": "missing@example.com",
       # "netId": "missing_netid", # Net ID missing
        "fullName": "Missing Test User",
    }
    response = client.post("/api/users/register", json=payload)
    print(f"POST /api/users/register Missing Field: Status {response.status_code}, Response: {response.text}")
    assert response.status_code == 422 # Pydantic validation error
    assert "Field required" in response.json()["detail"][0]["msg"]


# == /api/users/{googleId} (GET) ==

def test_get_user_by_googleid_success():
    # Uses TEST_USER_GOOGLE_ID from setup
    response = client.get(f"/api/users/{TEST_USER_GOOGLE_ID}")
    print(f"GET /api/users/{TEST_USER_GOOGLE_ID} Success: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["googleId"] == TEST_USER_GOOGLE_ID
    assert json_response["netId"] == TEST_USER_NET_ID

def test_get_user_by_googleid_not_found():
    non_existent_google_id = "non_existent_google_id_12345"
    response = client.get(f"/api/users/{non_existent_google_id}")
    print(f"GET /api/users/{non_existent_google_id} Not Found: Status {response.status_code}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# == /api/users/profile/{net_id} (GET) ==

@pytest.fixture
def user_profile_data():
    """Fixture to set up data for profile tests"""
    poster_net_id = f"profile_poster_{int(time.time())}"
    receiver_net_id = f"profile_receiver_{int(time.time())}"
    _register_user(f"g_{poster_net_id}", poster_net_id, f"{poster_net_id}@e.com", "Profile Poster")
    _register_user(f"g_{receiver_net_id}", receiver_net_id, f"{receiver_net_id}@e.com", "Profile Receiver")

    # Poster creates a post
    post_data = { "foodName": "Profile Post Item", "quantity": 1, "category": "Test", "dietaryInfo": "", "pickupLocation": "Test Loc", "pickupTime": datetime.now().isoformat(), "photo": json.dumps({"uri":"..."}), "user": poster_net_id, "expirationTime": datetime.now().isoformat(), "createdAt": datetime.now().isoformat()}
    post_resp = client.post("/api/food", data={k: str(v) for k, v in post_data.items()})
    post_id = post_resp.json()["food_id"]

    # Receiver reserves and completes it
    client.post("/api/food/reserve", json={"food_id": post_id, "user": receiver_net_id})
    client.post("/api/food/complete", data={"food_id": post_id, "user": receiver_net_id})

    return {"poster": poster_net_id, "receiver": receiver_net_id, "post_id": post_id}


def test_get_user_profile_success(user_profile_data):
    poster_net_id = user_profile_data["poster"]
    receiver_net_id = user_profile_data["receiver"]

    # Test Poster's profile
    response_poster = client.get(f"/api/users/profile/{poster_net_id}")
    print(f"GET /api/users/profile/{poster_net_id} (Poster): Status {response_poster.status_code}")
    assert response_poster.status_code == 200
    profile_poster = response_poster.json()
    assert profile_poster["username"] == "Profile Poster"
    assert profile_poster["post_count"] >= 1
    assert profile_poster["received_count"] == 0
    assert len(profile_poster["post_history"]) >= 1
    assert profile_poster["post_history"][0]["foodName"] == "Profile Post Item"
    assert len(profile_poster["received_history"]) == 0

    # Test Receiver's profile
    response_receiver = client.get(f"/api/users/profile/{receiver_net_id}")
    print(f"GET /api/users/profile/{receiver_net_id} (Receiver): Status {response_receiver.status_code}")
    assert response_receiver.status_code == 200
    profile_receiver = response_receiver.json()
    assert profile_receiver["username"] == "Profile Receiver"
    assert profile_receiver["post_count"] == 0
    assert profile_receiver["received_count"] >= 1
    assert len(profile_receiver["post_history"]) == 0
    assert len(profile_receiver["received_history"]) >= 1
    assert profile_receiver["received_history"][0]["foodName"] == "Profile Post Item"

    # Clean up this specific profile data
    users_collection.delete_one({"netId": poster_net_id})
    users_collection.delete_one({"netId": receiver_net_id})
    food_collection.delete_one({"_id": ObjectId(user_profile_data["post_id"])})


def test_get_user_profile_not_found():
    non_existent_net_id = "non_existent_netid_54321"
    response = client.get(f"/api/users/profile/{non_existent_net_id}")
    print(f"GET /api/users/profile/{non_existent_net_id} Not Found: Status {response.status_code}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


# == /api/users/check (POST) ==

def test_check_user_exists():
    # Uses TEST_USER_GOOGLE_ID from setup
    payload = {"googleId": TEST_USER_GOOGLE_ID}
    response = client.post("/api/users/check", json=payload)
    print(f"POST /api/users/check Exists: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["googleId"] == TEST_USER_GOOGLE_ID
    assert json_response["netId"] == TEST_USER_NET_ID
   


def test_check_user_not_found():
    payload = {"googleId": "non_existent_google_id_67890"}
    response = client.post("/api/users/check", json=payload)
    print(f"POST /api/users/check Not Found: Status {response.status_code}")
    assert response.status_code == 404
    


def test_check_user_invalid_body():
    payload = {"wrongField": TEST_USER_GOOGLE_ID} # Missing 'googleId'
    response = client.post("/api/users/check", json=payload)
    print(f"POST /api/users/check Invalid Body: Status {response.status_code}")
    assert response.status_code == 422 # Pydantic validation error

# == /api/users/netid/{googleId} (GET) ==

def test_get_user_netid_by_googleid_success():
    # Uses TEST_USER_GOOGLE_ID from setup
    response = client.get(f"/api/users/netid/{TEST_USER_GOOGLE_ID}")
    print(f"GET /api/users/netid/{TEST_USER_GOOGLE_ID} Success: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "netId" in json_response
    assert json_response["netId"] == TEST_USER_NET_ID

def test_get_user_netid_by_googleid_not_found():
    non_existent_google_id = "non_existent_google_id_112233"
    response = client.get(f"/api/users/netid/{non_existent_google_id}")
    print(f"GET /api/users/netid/{non_existent_google_id} Not Found: Status {response.status_code}")
    assert response.status_code == 404
    # Note the specific error message from this endpoint
    assert response.json()["detail"] == "User not found"

# == /api/food/poster-netid/{food_id} (GET) ==

def test_get_poster_netid_success(post_for_reporting): # Reuse fixture that creates post by TEST_USER_NET_ID
    food_id = post_for_reporting
    response = client.get(f"/api/food/poster-netid/{food_id}")
    print(f"GET /api/food/poster-netid/{food_id} Success: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert "netId" in json_response
    assert json_response["netId"] == TEST_USER_NET_ID # Check it's the correct poster

def test_get_poster_netid_food_not_found():
    non_existent_food_id = str(ObjectId())
    response = client.get(f"/api/food/poster-netid/{non_existent_food_id}")
    print(f"GET /api/food/poster-netid/{non_existent_food_id} Food Not Found: Status {response.status_code}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food post not found"

# == /api/report/can-report/{post_id}/{user_id} (GET) ==

@pytest.fixture
def reporting_scenario_data():
    """Set up a post and users for can-report tests"""
    poster_id = f"canreport_poster_{int(time.time())}"
    reporter_id = f"canreport_reporter_{int(time.time())}"
    _register_user(f"g_{poster_id}", poster_id, f"{poster_id}@e.com", "CanReport Poster")
    _register_user(f"g_{reporter_id}", reporter_id, f"{reporter_id}@e.com", "CanReport Reporter")

    post_data = { "foodName": "CanReport Item", "quantity": 1, "category": "Test", "dietaryInfo": "", "pickupLocation": "Here", "pickupTime": datetime.now().isoformat(), "photo": json.dumps({"uri":"..."}), "user": poster_id, "expirationTime": datetime.now().isoformat(), "createdAt": datetime.now().isoformat()}
    post_resp = client.post("/api/food", data={k: str(v) for k, v in post_data.items()})
    post_id = post_resp.json()["food_id"]

    # Reporter submits one report for the "already reported" test case
    report_payload = {"postId": post_id, "message": "Initial report", "user1Id": reporter_id, "user2Id": poster_id}
    client.post("/api/report", data=report_payload)

    data = {"poster": poster_id, "reporter": reporter_id, "post_id": post_id}
    yield data

    # Cleanup
    users_collection.delete_one({"netId": poster_id})
    users_collection.delete_one({"netId": reporter_id})
    food_collection.delete_one({"_id": ObjectId(post_id)})
    report_collection.delete_many({"postId": post_id})


def test_can_report_success(reporting_scenario_data):
    post_id = reporting_scenario_data["post_id"]
    # Use a *different* reporter ID who hasn't reported yet
    third_user_id = f"third_user_{int(time.time())}"
    _register_user(f"g_{third_user_id}", third_user_id, f"{third_user_id}@e.com", "Third User")

    response = client.get(f"/api/report/can-report/{post_id}/{third_user_id}")
    print(f"GET /api/report/can-report Success: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["canReport"] is True
    assert json_response["reason"] is None

    # Cleanup third user
    users_collection.delete_one({"netId": third_user_id})


def test_can_report_cannot_report_own_post(reporting_scenario_data):
    post_id = reporting_scenario_data["post_id"]
    poster_id = reporting_scenario_data["poster"] # Poster tries to report their own post
    response = client.get(f"/api/report/can-report/{post_id}/{poster_id}")
    print(f"GET /api/report/can-report Own Post: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["canReport"] is False
    assert json_response["reason"] == "You cannot report your own post"

def test_can_report_already_reported(reporting_scenario_data):
    post_id = reporting_scenario_data["post_id"]
    reporter_id = reporting_scenario_data["reporter"] # This user already reported in the fixture
    response = client.get(f"/api/report/can-report/{post_id}/{reporter_id}")
    print(f"GET /api/report/can-report Already Reported: Status {response.status_code}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["canReport"] is False
    assert json_response["reason"] == "You have already reported this post"

def test_can_report_post_not_found(reporting_scenario_data):
    non_existent_post_id = str(ObjectId())
    reporter_id = reporting_scenario_data["reporter"]
    response = client.get(f"/api/report/can-report/{non_existent_post_id}/{reporter_id}")
    print(f"GET /api/report/can-report Post Not Found: Status {response.status_code}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food post not found"

