import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
import json
import time
from datetime import datetime
from unittest.mock import patch, MagicMock # Added for mocking


# --- Helper ---
def generate_unique_user_data(prefix: str):
    """Generates unique user details for isolated tests."""
    ts = int(time.time() * 1000) # Use milliseconds for higher uniqueness
    uid = f"{prefix}_{ts}"
    return {
        "googleId": f"g_{uid}",
        "netId": f"n_{uid}",
        "email": f"{uid}@example.com",
        "username": f"user_{uid}",
        "password": "password123",
        "fullName": f"User {uid.replace('_', ' ').title()}",
        "phoneNumber": f"555{str(ts)[-7:]}", # More unique phone
        "picture": f"http://example.com/{uid}.jpg"
    }

# --- Test Functions ---

# == POST /api/users/signup ==
def test_signup_success(client):
    """Tests successful user signup via email/password."""
    user_data = generate_unique_user_data("signup_succ")
    # Ensure all required fields by UserCreate model are present
    payload = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password": user_data["password"],
        "netId": user_data["netId"],
        "fullName": user_data["fullName"],
        "phoneNumber": user_data.get("phoneNumber"), # Optional fields
        "picture": user_data.get("picture")         # Optional fields
    }
    # Filter out None values if your model expects fields to be absent not None
    payload = {k: v for k, v in payload.items() if v is not None}

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User registered successfully"

def test_signup_duplicate_email(client, test_user_data):
    """Tests signup with an email that already exists."""
    user_data = generate_unique_user_data("signup_dup_email")
    payload = {k: user_data[k] for k in ["username", "password", "netId", "fullName"]}
    payload["email"] = test_user_data["email"] # Use existing email

    response = client.post("/api/users/signup", json=payload)
    # Assuming your router raises 400 for duplicate email based on initial check
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_signup_duplicate_username(client, test_user_data):
    """Tests signup with a username that already exists."""
    user_data = generate_unique_user_data("signup_dup_user")
    payload = {k: user_data[k] for k in ["email", "password", "netId", "fullName"]}
    payload["username"] = test_user_data["username"] # Use existing username

    response = client.post("/api/users/signup", json=payload)
    # Assuming your router raises 400 for duplicate username based on initial check
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]

def test_signup_duplicate_netid(client, test_user_data):
    """Tests signup with a Net ID that already exists."""
    user_data = generate_unique_user_data("signup_dup_netid")
    payload = {k: user_data[k] for k in ["username", "email", "password", "fullName"]}
    payload["netId"] = test_user_data["netId"] # Use existing Net ID

    response = client.post("/api/users/signup", json=payload)
    # Assuming your router raises 409 for duplicate NetID based on initial check
    assert response.status_code == 409
    assert "Net ID is already registered" in response.json()["detail"]

def test_signup_missing_field(client):
    """Tests signup with a missing required field (e.g., password)."""
    user_data = generate_unique_user_data("signup_miss")
    payload = {k: user_data[k] for k in ["username", "email", "netId", "fullName"]} # Missing password

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 422 # FastAPI/Pydantic validation error
    assert any(d['loc'] == ['body', 'password'] for d in response.json()["detail"])

def test_signup_invalid_email(client):
    """Tests signup with an invalid email format."""
    user_data = generate_unique_user_data("signup_invemail")
    payload = {k: user_data[k] for k in ["username", "password", "netId", "fullName"]}
    payload["email"] = "not-a-valid-email"

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 422 # Pydantic validation
    assert any(d['loc'] == ['body', 'email'] for d in response.json()["detail"])

# --- Tests for Added Coverage ---

@patch("database.users_collection.insert_one") # Mock insert_one
@patch("database.users_collection.find_one", return_value=None) # Mock find_one to bypass duplicate checks
def test_signup_insert_failure(mock_find, mock_insert, client):
    """Tests the scenario where insert_one doesn't return an inserted_id."""
    user_data = generate_unique_user_data("signup_ins_fail")
    payload = {k: user_data[k] for k in ["username", "email", "password", "netId", "fullName"]}

    # Configure the mock insert_one to return a result without inserted_id
    mock_result = MagicMock()
    mock_result.inserted_id = None
    mock_insert.return_value = mock_result

    response = client.post("/api/users/signup", json=payload)
    # Check the status code and detail message defined in the router's 'else' block for insert failure
    assert response.status_code == 500
    assert "Failed to register user" in response.json()["detail"] # Adjust message if needed

@patch("database.users_collection.find_one") # Target the first DB call in the endpoint
def test_signup_generic_exception(mock_find, client):
    """Tests the generic exception handler during signup."""
    user_data = generate_unique_user_data("signup_generic_err")
    payload = {k: user_data[k] for k in ["username", "email", "password", "netId", "fullName"]}

    # Make the mocked find_one raise a generic Exception
    mock_find.side_effect = Exception("Unexpected DB error during find")

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 500
    # Adjust detail message based on your router's generic exception handler for signup
    assert "An unexpected error occurred during signup" in response.json()["detail"]

# == POST /api/users/email-login ==
def test_email_login_success(client, test_user_data):
    """Tests successful login with correct email/password."""
    payload = {"email": test_user_data["email"], "password": test_user_data["password"]}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    json_response = response.json()
    assert json_response["success"] is True
    assert json_response["message"] == "Login successful"
    assert "user" in json_response
    assert json_response["user"]["email"] == test_user_data["email"]
    assert "password" not in json_response["user"] # Ensure password hash not returned
    assert "lastLogin" in json_response["user"]

def test_email_login_wrong_password(client, test_user_data):
    """Tests login with incorrect password."""
    payload = {"email": test_user_data["email"], "password": "thisiswrong"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_email_login_user_not_found(client):
    """Tests login with an email that does not exist."""
    payload = {"email": f"nonexistent_{int(time.time())}@example.com", "password": "password"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_email_login_invalid_email_format(client):
    """Tests login with an invalid email format."""
    payload = {"email": "not-an-email", "password": "password"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 422 # Pydantic validation

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_email_login_generic_exception(mock_find, client, test_user_data):
    """Tests the generic exception handler during email login."""
    payload = {"email": test_user_data["email"], "password": test_user_data["password"]}
    mock_find.side_effect = Exception("Unexpected DB error during login find")

    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 500
    # Adjust detail message based on your router's generic exception handler for login
    assert "An unexpected error occurred during login" in response.json()["detail"]

# == POST /api/users/auth-check ==
# Assuming this endpoint exists and mirrors login logic but maybe returns less data
def test_auth_check_success(client, test_user_data):
    """Tests successful auth check."""
    payload = {"email": test_user_data["email"], "password": test_user_data["password"]}
    response = client.post("/api/users/auth-check", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    json_response = response.json()
    assert json_response["success"] is True
    assert "user" in json_response
    assert json_response["user"]["email"] == test_user_data["email"]

def test_auth_check_failure(client, test_user_data):
    """Tests failed auth check (wrong password)."""
    payload = {"email": test_user_data["email"], "password": "wrongpassword"}
    response = client.post("/api/users/auth-check", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials" # Match endpoint's specific message

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_auth_check_generic_exception(mock_find, client, test_user_data):
    """Tests the generic exception handler during auth check."""
    payload = {"email": test_user_data["email"], "password": test_user_data["password"]}
    mock_find.side_effect = Exception("Unexpected DB error during auth check find")

    response = client.post("/api/users/auth-check", json=payload)
    assert response.status_code == 500
    # Adjust detail message based on your router's generic exception handler for auth check
    assert "An unexpected error occurred during auth check" in response.json()["detail"]


# == POST /api/users/register (Google/NetID Flow) ==
def test_register_via_google_success_new(client):
    """Tests registering a completely new user via Google/NetID flow."""
    user_data = generate_unique_user_data("greg_new")
    payload = {
        "googleId": user_data["googleId"],
        "email": user_data["email"],
        "netId": user_data["netId"],
        "fullName": user_data["fullName"],
        "phoneNumber": user_data.get("phoneNumber"),
        "picture": user_data.get("picture")
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User registered successfully"

def test_register_via_google_success_update(client, test_user_data):
    """Tests updating an existing user via Google/NetID flow."""
    from database import users_collection # Direct access for verification
    original_user = users_collection.find_one({"googleId": test_user_data["googleId"]})
    assert original_user is not None

    payload = {
        "googleId": test_user_data["googleId"],
        "email": test_user_data["email"], # Should not be updated by this endpoint typically
        "netId": test_user_data["netId"], # Should match existing
        "fullName": f"Updated Name {time.time()}", # Update name
        "phoneNumber": f"555{int(time.time() % 10000000)}", # Update phone
        "picture": f"updated_{time.time()}.jpg"
    }
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User updated successfully"

    # Verify update in DB
    user = users_collection.find_one({"googleId": test_user_data["googleId"]})
    assert user["fullName"] == payload["fullName"]
    assert user["phoneNumber"] == payload["phoneNumber"]
    assert user["picture"] == payload["picture"]
    assert user["email"] == original_user["email"] # Email shouldn't change here
    assert user["_id"] == original_user["_id"] # ID shouldn't change

def test_register_via_google_no_update_needed(client, test_user_data):
    """Tests the case where update data matches existing data exactly."""
    from database import users_collection # Direct access for setup/verification
    user = users_collection.find_one({"googleId": test_user_data["googleId"]})
    assert user is not None # Ensure user exists for the test

    payload = {
        "googleId": user["googleId"],
        "email": user["email"], # Use exact existing email
        "netId": user["netId"], # Use exact existing netId
        "fullName": user["fullName"], # Same name
        "phoneNumber": user.get("phoneNumber"), # Use get for potential None
        "picture": user.get("picture") # Use get for potential None
    }
    # Remove keys if their value is None to exactly match DB state potentially
    payload = {k: v for k, v in payload.items() if v is not None}

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    # **** Assert the specific message for the no-update path ****
    assert response.json()["message"] == "User updated successfully" # Adjust if needed

def test_register_via_google_conflict_netid(client, test_user_data):
    """Tests registering a new Google ID with an existing Net ID."""
    user_data = generate_unique_user_data("greg_conf_netid")
    payload = {k: user_data[k] for k in ["googleId", "email", "fullName"]}
    payload["netId"] = test_user_data["netId"] # Existing Net ID

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 409
    assert "Net ID is already registered" in response.json()["detail"]

def test_register_via_google_missing_field(client):
    """Tests Google/NetID registration with a missing required field (e.g., netId)."""
    user_data = generate_unique_user_data("greg_miss")
    payload = {k: user_data[k] for k in ["googleId", "email", "fullName"]} # Missing netId

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 422 # Pydantic validation
    assert any(d['loc'] == ['body', 'netId'] for d in response.json()["detail"])

# --- Tests for Added Coverage ---
@patch("database.users_collection.insert_one") # Mock insert_one
@patch("database.users_collection.find_one", return_value=None) # Mock find_one to bypass existing user check
def test_register_insert_failure(mock_find, mock_insert, client):
    """Tests insert failure during the 'register' endpoint for a new user."""
    user_data = generate_unique_user_data("greg_ins_fail")
    payload = {k: user_data[k] for k in ["googleId", "email", "netId", "fullName"]}

    mock_result = MagicMock()
    mock_result.inserted_id = None
    mock_insert.return_value = mock_result

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 500
    assert "Failed to register user" in response.json()["detail"] # Adjust message if needed


@patch("database.users_collection.find_one")
def test_register_generic_exception_find(mock_find, client):
    """Tests generic exception during the find_one check in 'register'."""
    user_data = generate_unique_user_data("greg_generic_find")
    payload = {k: user_data[k] for k in ["googleId", "email", "netId", "fullName"]}
    mock_find.side_effect = Exception("Unexpected DB error during find")

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 500
    # Adjust detail based on generic handler in 'register'
    assert "An unexpected error occurred during user registration" in response.json()["detail"]


@patch("database.users_collection.find_one") # Mock find to return existing user
@patch("database.users_collection.update_one") # Mock update to cause error
def test_register_generic_exception_update(mock_update, mock_find, client, test_user_data):
    """Tests generic exception during the update_one call in 'register'."""
    # Simulate finding the existing user
    mock_find.return_value = test_user_data

    payload = {
        "googleId": test_user_data["googleId"],
        "email": test_user_data["email"],
        "netId": test_user_data["netId"],
        "fullName": f"Update Fail Name {time.time()}" # Data needs to differ to attempt update
    }
    # Make update_one raise an error
    mock_update.side_effect = Exception("Unexpected DB error during update")

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 500
     # Adjust detail based on generic handler in 'register'
    assert "An unexpected error occurred during user registration" in response.json()["detail"]


# == GET /api/users/{googleId} ==
def test_get_user_by_googleid_success(client, test_user_data):
    """Tests retrieving user details by Google ID."""
    response = client.get(f"/api/users/{test_user_data['googleId']}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["googleId"] == test_user_data["googleId"]
    assert json_response["netId"] == test_user_data["netId"]
    assert json_response["email"] == test_user_data["email"]


def test_get_user_by_googleid_not_found(client):
    """Tests retrieving a non-existent user by Google ID."""
    response = client.get(f"/api/users/non_existent_google_id_{time.time()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_get_user_by_googleid_generic_exception(mock_find, client, test_user_data):
    """Tests generic exception during get user by googleId."""
    mock_find.side_effect = Exception("Unexpected DB error")
    response = client.get(f"/api/users/{test_user_data['googleId']}")
    assert response.status_code == 500
    assert "An unexpected error occurred while fetching user data" in response.json()["detail"]


# == GET /api/users/profile/{net_id} ==
# Ensure 'other_user_data' and 'completed_food_post' fixtures are set up in conftest.py
# 'completed_food_post' should have test_user as poster, other_user as receiver
def test_get_user_profile_success(client, test_user_data, other_user_data, completed_food_post):
    """Tests retrieving a user's profile, including post/received history."""
    # Verify fixture setup preconditions
    assert "posterNetId" in completed_food_post and completed_food_post["posterNetId"] == test_user_data["netId"]
    assert "reserverNetId" in completed_food_post and completed_food_post["reserverNetId"] == other_user_data["netId"]
    # Ensure the fixture post ID is available, assuming MongoDB ObjectId
    post_id_str = str(completed_food_post["id"])


    poster_net_id = test_user_data["netId"]
    receiver_net_id = other_user_data["netId"]

    # Test Poster's profile (test_user)
    response_poster = client.get(f"/api/users/profile/{poster_net_id}")
    assert response_poster.status_code == 200, f"Poster Profile Error: {response_poster.text}"
    profile_poster = response_poster.json()
    # Assuming profile response model field is 'username' mapping to 'fullName'
    assert profile_poster["email"] == test_user_data["email"]
    assert profile_poster["post_count"] >= 1
    assert profile_poster["received_count"] >= 0 # Poster might have received other items
    assert len(profile_poster["post_history"]) >= 1
    # Check if the specific completed post is in the poster's history (compare string IDs)
    assert any(post.get("id") == post_id_str for post in profile_poster["post_history"])

    # Test Receiver's profile (other_user)
    response_receiver = client.get(f"/api/users/profile/{receiver_net_id}")
    assert response_receiver.status_code == 200, f"Receiver Profile Error: {response_receiver.text}"
    profile_receiver = response_receiver.json()
    assert profile_receiver["username"] == other_user_data["fullName"]
    assert profile_receiver["email"] == other_user_data["email"]
    assert profile_receiver["post_count"] >= 0 # Receiver might have posted other items
    assert profile_receiver["received_count"] >= 1
    assert len(profile_receiver["received_history"]) >= 1
    assert any(rec.get("id") == post_id_str for rec in profile_receiver["received_history"])

def test_get_user_profile_no_history(client, test_user_data):
    """Tests retrieving profile for user known to have no post/receive history."""
    new_user_data = generate_unique_user_data("profile_clean")
    # Minimal signup to create the user
    signup_payload = {"username": new_user_data["username"], "email": new_user_data["email"], "password": new_user_data["password"], "netId": new_user_data["netId"], "fullName": new_user_data["fullName"]}
    signup_resp = client.post("/api/users/signup", json=signup_payload)
    assert signup_resp.status_code == 200 # Ensure user is created


    # Now get the profile for the newly created user's Net ID
    response = client.get(f"/api/users/profile/{new_user_data['netId']}")
    assert response.status_code == 200
    profile = response.json()
    assert profile["username"] == new_user_data["fullName"]
    assert profile["email"] == new_user_data["email"]
    assert profile["post_count"] == 0
    assert profile["received_count"] == 0
    assert profile["post_history"] == []
    assert profile["received_history"] == []

def test_get_user_profile_not_found(client):
    """Tests retrieving profile for a non-existent Net ID."""
    response = client.get(f"/api/users/profile/non_existent_netid_{time.time()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one") # Mock the first DB call (finding user)
def test_get_user_profile_generic_exception_find_user(mock_find_user, client, test_user_data):
    """Tests generic exception when finding the user in profile endpoint."""
    mock_find_user.side_effect = Exception("DB error finding profile user")
    response = client.get(f"/api/users/profile/{test_user_data['netId']}")
    assert response.status_code == 500
    assert "An unexpected error occurred while fetching profile data" in response.json()["detail"]

@patch("database.users_collection.find_one") # Mock user find to succeed
@patch("database.food_collection.find") # Mock food find to fail
def test_get_user_profile_generic_exception_find_food(mock_find_food, mock_find_user, client, test_user_data):
    """Tests generic exception when finding food posts in profile endpoint."""
    # Simulate finding the user successfully
    mock_find_user.return_value = test_user_data
    # Simulate error when querying food collection
    mock_find_food.side_effect = Exception("DB error finding food posts")

    response = client.get(f"/api/users/profile/{test_user_data['netId']}")
    assert response.status_code == 500
    assert "An unexpected error occurred while fetching profile data" in response.json()["detail"]


# == POST /api/users/check ==
def test_check_user_exists(client, test_user_data):
    """Tests checking for an existing user by Google ID."""
    payload = {"googleId": test_user_data["googleId"]}
    response = client.post("/api/users/check", json=payload)
    assert response.status_code == 200
    json_response = response.json()
    # Assuming UserCheckResponse includes these fields
    assert json_response["googleId"] == test_user_data["googleId"]
    assert json_response["netId"] == test_user_data["netId"]
    assert json_response["email"] == test_user_data["email"]
    assert "exists" not in json_response # Or assert exists == True if that's the structure


def test_check_user_not_found(client):
    """Tests checking for a non-existent user by Google ID."""
    payload = {"googleId": f"non_existent_check_{time.time()}"}
    response = client.post("/api/users/check", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_check_user_invalid_body(client):
    """Tests checking user with invalid request body."""
    payload = {"wrongField": "some_google_id"} # Missing 'googleId'
    response = client.post("/api/users/check", json=payload)
    assert response.status_code == 422 # Pydantic validation error

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_check_user_generic_exception(mock_find, client, test_user_data):
    """Tests generic exception during user check."""
    payload = {"googleId": test_user_data["googleId"]}
    mock_find.side_effect = Exception("DB error during check")
    response = client.post("/api/users/check", json=payload)
    assert response.status_code == 500
    assert "An unexpected error occurred during user check" in response.json()["detail"]


# == GET /api/users/netid/{googleId} ==
def test_get_user_netid_by_googleid_success(client, test_user_data):
    """Tests retrieving Net ID using Google ID."""
    response = client.get(f"/api/users/netid/{test_user_data['googleId']}")
    assert response.status_code == 200
    assert response.json() == {"netId": test_user_data["netId"]}

def test_get_user_netid_by_googleid_not_found(client):
    """Tests retrieving Net ID for a non-existent Google ID."""
    response = client.get(f"/api/users/netid/non_existent_netid_{time.time()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_get_user_netid_generic_exception(mock_find, client, test_user_data):
    """Tests generic exception during get netid by googleid."""
    mock_find.side_effect = Exception("DB error finding netid")
    response = client.get(f"/api/users/netid/{test_user_data['googleId']}")
    assert response.status_code == 500
    assert "An unexpected error occurred while fetching netId" in response.json()["detail"]


# == POST /api/users/check-email ==
def test_check_email_exists(client, test_user_data):
    """Tests checking for an existing email."""
    payload = {"email": test_user_data["email"]}
    response = client.post("/api/users/check-email", json=payload)
    assert response.status_code == 200
    assert response.json() == {"exists": True}

def test_check_email_does_not_exist(client):
    """Tests checking for a non-existent email."""
    payload = {"email": f"nonexistent_check_{time.time()}@example.com"}
    response = client.post("/api/users/check-email", json=payload)
    assert response.status_code == 200
    assert response.json() == {"exists": False}

def test_check_email_invalid_format(client):
    """Tests checking email with an invalid format."""
    payload = {"email": "invalid-email"}
    response = client.post("/api/users/check-email", json=payload)
    assert response.status_code == 422 # Pydantic validation

# --- Test for Added Coverage ---
@patch("database.users_collection.find_one")
def test_check_email_generic_exception(mock_find, client, test_user_data):
    """Tests generic exception during check-email."""
    payload = {"email": test_user_data["email"]}
    mock_find.side_effect = Exception("DB error during email check")
    response = client.post("/api/users/check-email", json=payload)
    assert response.status_code == 500
    assert "An error occurred while checking email existence" in response.json()["detail"]
    

@patch("database.users_collection.find_one") # Mock the database call
def test_get_user_by_googleid_validation_error(mock_find_one, client, test_user_data):
    """
    Tests the ValidationError handler when DB data fails response model validation.
    Covers the `except ValidationError as ve:` block in the get_user endpoint.
    """
    # --- Arrange ---
    google_id_to_test = test_user_data['googleId']

    invalid_user_data_from_db = {
        "_id": ObjectId(), # Must be present to be popped later
        "googleId": google_id_to_test,
        "netId": "some_netid",
        "fullName": "Test User Missing Field",
        # "email": "test@example.com", # <-- Intentionally missing required field
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
        "role": "user"

    }
    mock_find_one.return_value = invalid_user_data_from_db

    # --- Act ---
    response = client.get(f"/api/users/{google_id_to_test}")

    # --- Assert ---
    # This exception handler raises a 500 status code in your code
    assert response.status_code == 500, f"Response: {response.text}"
    # Check the specific detail message from that except block
    assert "Error formatting user data." in response.json()["detail"]


# Assuming pytest for running the test and Python's unittest.mock for mocking
import pytest
from unittest.mock import MagicMock, patch # Or your preferred mocking library

# Import the specific function and necessary components from your code
from routers.users import check_email # Adjust import path as needed
from models import EmailCheckRequest    # Adjust import path as needed
from fastapi import HTTPException
from pymongo.collection import Collection # Needed for type hinting the mock

@pytest.mark.asyncio
async def test_check_email_unexpected_db_error():
    """
    Test POST /api/users/check-email when the database operation
    raises an unexpected exception. Tests the generic exception handler.
    """
    # --- Setup ---
    # Create mock database collection object
    mock_db = MagicMock(spec=Collection)

    # Configure the mock's find_one method to raise a generic Exception
    test_exception = Exception("Simulated database connection failure")
    mock_db.find_one.side_effect = test_exception

    # Prepare the input data model
    request_data = EmailCheckRequest(email="test_error@example.com")

    # --- Action & Assertion ---
    # Use pytest.raises to assert that the specific HTTPException is raised
    with pytest.raises(HTTPException) as exc_info:
        await check_email(data=request_data, db=mock_db)

    # Assert the details of the raised HTTPException
    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "An error occurred while checking email existence."

    # Verify that find_one was called once with the correct email
    mock_db.find_one.assert_called_once_with(
        {"email": "test_error@example.com"}, {"_id": 1}
    )

def test_signup_existing_netid(client, mocker):
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "secret",
        "netId": "abc123",
        "fullName": "Test User",
        "phoneNumber": "1234567890",
        "picture": "pic.jpg"
    }

    mock_db = mocker.Mock()
    mock_db.find_one.side_effect = [None, None, {"netId": "abc123"}]
    mocker.patch("routers.users.get_users_collection", return_value=mock_db)

    response = client.post("/api/users/signup", json=user_data)
    assert response.status_code == 409
    assert response.json()["detail"] == "This Net ID is already registered."
    
from pymongo.errors import DuplicateKeyError

def test_signup_duplicate_key_error(client, mocker):
    user_data = {
        "email": "dupe@example.com",
        "username": "dupeuser",
        "password": "secret",
        "netId": "dupe123",
        "fullName": "Dupe User",
        "phoneNumber": "1234567890",
        "picture": "pic.jpg"
    }

    mock_db = mocker.Mock()
    mock_db.find_one.return_value = None
    mock_db.insert_one.side_effect = DuplicateKeyError("duplicate key error: username")

    mocker.patch("routers.users.get_users_collection", return_value=mock_db)

    response = client.post("/api/users/signup", json=user_data)
    assert response.status_code == 409
    assert response.json()["detail"] == "Username already exists."
    
    
def test_signup_unexpected_error(client, mocker):
    user_data = {
        "email": "error@example.com",
        "username": "erroruser",
        "password": "secret",
        "netId": "error123",
        "fullName": "Error User",
        "phoneNumber": "1234567890",
        "picture": "pic.jpg"
    }

    mock_db = mocker.Mock()
    mock_db.find_one.return_value = None
    mock_db.insert_one.side_effect = Exception("Unexpected failure")

    mocker.patch("routers.users.get_users_collection", return_value=mock_db)

    response = client.post("/api/users/signup", json=user_data)
    assert response.status_code == 500
    assert "unexpected" in response.json()["detail"].lower()