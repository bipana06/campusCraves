import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
import json
import time
from datetime import datetime

# Fixtures 'client', 'test_user_data', 'other_user_data', 'completed_food_post'
# are automatically available from conftest.py

# --- Helper ---
def generate_unique_user_data(prefix: str):
    """Generates unique user details for isolated tests."""
    uid = f"{prefix}_{int(time.time())}"
    return {
        "googleId": f"g_{uid}",
        "netId": f"n_{uid}",
        "email": f"{uid}@example.com",
        "username": f"user_{uid}",
        "password": "password123",
        "fullName": f"User {uid.replace('_', ' ').title()}",
        "phoneNumber": "5551234",
        "picture": "some_url.jpg"
    }

# --- Test Functions ---

# == POST /api/users/signup ==
def test_signup_success(client):
    """Tests successful user signup via email/password."""
    user_data = generate_unique_user_data("signup_succ")
    payload = {k: user_data[k] for k in ["username", "email", "password", "netId", "fullName", "phoneNumber", "picture"]}

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User registered successfully"
    # Optional: Verify user exists in DB (but cleanup will remove them)

def test_signup_duplicate_email(client, test_user_data):
    """Tests signup with an email that already exists."""
    user_data = generate_unique_user_data("signup_dup_email")
    payload = {k: user_data[k] for k in ["username", "password", "netId", "fullName"]}
    payload["email"] = test_user_data["email"] # Use existing email

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_signup_duplicate_username(client, test_user_data):
    """Tests signup with a username that already exists."""
    user_data = generate_unique_user_data("signup_dup_user")
    payload = {k: user_data[k] for k in ["email", "password", "netId", "fullName"]}
    payload["username"] = test_user_data["username"] # Use existing username

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]

def test_signup_duplicate_netid(client, test_user_data):
    """Tests signup with a Net ID that already exists."""
    user_data = generate_unique_user_data("signup_dup_netid")
    payload = {k: user_data[k] for k in ["username", "email", "password", "fullName"]}
    payload["netId"] = test_user_data["netId"] # Use existing Net ID

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 409
    assert "Net ID is already registered" in response.json()["detail"]

def test_signup_missing_field(client):
    """Tests signup with a missing required field (e.g., password)."""
    user_data = generate_unique_user_data("signup_miss")
    payload = {k: user_data[k] for k in ["username", "email", "netId", "fullName"]} # Missing password

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 422
    assert any(d['loc'] == ['body', 'password'] for d in response.json()["detail"])

def test_signup_invalid_email(client):
    """Tests signup with an invalid email format."""
    user_data = generate_unique_user_data("signup_invemail")
    payload = {k: user_data[k] for k in ["username", "password", "netId", "fullName"]}
    payload["email"] = "not-a-valid-email"

    response = client.post("/api/users/signup", json=payload)
    assert response.status_code == 422 # Pydantic validation
    assert any(d['loc'] == ['body', 'email'] for d in response.json()["detail"])


# == POST /api/users/email-login ==
def test_email_login_success(client, test_user_data):
    """Tests successful login with correct email/password."""
    # Assumes test_user_data was created via direct DB insert or signup in setup
    payload = {"email": test_user_data["email"], "password": test_user_data["password"]}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    json_response = response.json()
    assert json_response["success"] is True
    assert json_response["message"] == "Login successful"
    assert "user" in json_response
    assert json_response["user"]["email"] == test_user_data["email"]
    assert "password" not in json_response["user"] # Ensure password hash not returned
    assert "lastLogin" in json_response["user"] # Check last login was updated

def test_email_login_wrong_password(client, test_user_data):
    """Tests login with incorrect password."""
    payload = {"email": test_user_data["email"], "password": "thisiswrong"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_email_login_user_not_found(client):
    """Tests login with an email that does not exist."""
    payload = {"email": f"nonexistent_{time.time()}@example.com", "password": "password"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_email_login_invalid_email_format(client):
    """Tests login with an invalid email format."""
    payload = {"email": "not-an-email", "password": "password"}
    response = client.post("/api/users/email-login", json=payload)
    assert response.status_code == 422 # Pydantic validation


# == POST /api/users/auth-check ==
# This endpoint seems redundant with /email-login. Testing its behavior as implemented.
def test_auth_check_success(client, test_user_data):
    """Tests successful auth check (behaves like login)."""
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
    assert response.json()["detail"] == "Invalid credentials"


# == POST /api/users/register (Google/NetID Flow) ==
def test_register_via_google_success_new(client):
    """Tests registering a completely new user via Google/NetID flow."""
    user_data = generate_unique_user_data("greg_new")
    payload = {k: user_data[k] for k in ["googleId", "email", "netId", "fullName", "phoneNumber", "picture"]}
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User registered successfully"

def test_register_via_google_success_update(client, test_user_data):
    """Tests updating an existing user via Google/NetID flow."""
    payload = {
        "googleId": test_user_data["googleId"],
        "email": test_user_data["email"], # Should not be updated by this endpoint
        "netId": test_user_data["netId"], # Should match existing
        "fullName": f"Updated Name {time.time()}", # Update name
        "phoneNumber": f"{time.time()}", # Update phone
        "picture": f"updated_{time.time()}.jpg"
    }
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "User updated successfully"
    # Verify update in DB
    from database import users_collection
    user = users_collection.find_one({"googleId": test_user_data["googleId"]})
    assert user["fullName"] == payload["fullName"]
    assert user["phoneNumber"] == payload["phoneNumber"]
    assert user["picture"] == payload["picture"]

def test_register_via_google_no_update_needed(client, test_user_data):
    """Tests the case where update data matches existing data."""
    from database import users_collection
    user = users_collection.find_one({"googleId": test_user_data["googleId"]})

    payload = {
        "googleId": test_user_data["googleId"],
        "email": test_user_data["email"],
        "netId": test_user_data["netId"],
        "fullName": user["fullName"], # Same name
        "phoneNumber": user["phoneNumber"], # Same phone
        "picture": user["picture"] # Same picture
    }
    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    # Check if the message indicates no update or successful update (depends on impl)
    # Current implementation likely returns "User updated successfully" even if no fields changed.
    # A more specific check could be "User data is already up to date." if implemented.
    assert "User updated successfully" in response.json()["message"] # Adjust if needed


def test_register_via_google_conflict_netid(client, test_user_data):
    """Tests registering a new Google ID with an existing Net ID."""
    user_data = generate_unique_user_data("greg_conf_netid")
    payload = {k: user_data[k] for k in ["googleId", "email", "fullName"]}
    payload["netId"] = test_user_data["netId"] # Existing Net ID

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 409
    assert "Net ID is already registered" in response.json()["detail"]

def test_register_via_google_missing_field(client):
    """Tests Google/NetID registration with a missing required field."""
    user_data = generate_unique_user_data("greg_miss")
    payload = {k: user_data[k] for k in ["googleId", "email", "fullName"]} # Missing netId

    response = client.post("/api/users/register", json=payload)
    assert response.status_code == 422
    assert any(d['loc'] == ['body', 'netId'] for d in response.json()["detail"])


# == GET /api/users/{googleId} ==
def test_get_user_by_googleid_success(client, test_user_data):
    """Tests retrieving user details by Google ID."""
    response = client.get(f"/api/users/{test_user_data['googleId']}")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["googleId"] == test_user_data["googleId"]
    assert json_response["netId"] == test_user_data["netId"]
    assert json_response["email"] == test_user_data["email"]
    assert "password" not in json_response # Ensure password hash not exposed

def test_get_user_by_googleid_not_found(client):
    """Tests retrieving a non-existent user by Google ID."""
    response = client.get(f"/api/users/non_existent_google_id_{time.time()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


# == GET /api/users/profile/{net_id} ==
def test_get_user_profile_success(client, test_user_data, completed_food_post):
    """Tests retrieving a user's profile, including post/received history."""
    # completed_food_post ensures test_user posted and other_user received
    poster_net_id = completed_food_post["posterNetId"] # Should be test_user
    receiver_net_id = completed_food_post["reserverNetId"] # Should be other_user

    # Test Poster's profile (test_user)
    response_poster = client.get(f"/api/users/profile/{poster_net_id}")
    assert response_poster.status_code == 200, f"Poster Profile Error: {response_poster.text}"
    profile_poster = response_poster.json()
    assert profile_poster["username"] == test_user_data["fullName"] # Check username/fullname mapping
    assert profile_poster["email"] == test_user_data["email"]
    assert profile_poster["post_count"] >= 1
    assert profile_poster["received_count"] >= 0 # Poster might have received other items
    assert len(profile_poster["post_history"]) >= 1
    # Check if the completed post is in the poster's history
    assert any(post["id"] == completed_food_post["id"] for post in profile_poster["post_history"])

    # Test Receiver's profile (other_user)
    response_receiver = client.get(f"/api/users/profile/{receiver_net_id}")
    assert response_receiver.status_code == 200, f"Receiver Profile Error: {response_receiver.text}"
    profile_receiver = response_receiver.json()
    # assert profile_receiver["username"] == other_user_data["fullName"] # Assuming other_user fixture exists
    assert profile_receiver["post_count"] >= 0 # Receiver might have posted other items
    assert profile_receiver["received_count"] >= 1
    assert len(profile_receiver["received_history"]) >= 1
    # Check if the completed post is in the receiver's history
    assert any(rec["id"] == completed_food_post["id"] for rec in profile_receiver["received_history"])


def test_get_user_profile_not_found(client):
    """Tests retrieving profile for a non-existent Net ID."""
    response = client.get(f"/api/users/profile/non_existent_netid_{time.time()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# == POST /api/users/check ==
def test_check_user_exists(client, test_user_data):
    """Tests checking for an existing user by Google ID."""
    payload = {"googleId": test_user_data["googleId"]}
    response = client.post("/api/users/check", json=payload)
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["googleId"] == test_user_data["googleId"]
    assert json_response["netId"] == test_user_data["netId"]
    assert "password" not in json_response

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
