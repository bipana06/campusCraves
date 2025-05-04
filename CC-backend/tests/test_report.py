import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
import time
from datetime import datetime

# Fixtures 'client', 'test_user_data', 'other_user_data',
# 'available_food_post', 'reported_food_post'
# are automatically available from conftest.py

# --- Test Functions ---

# == POST /api/report ==
def test_submit_report_success(client, available_food_post, other_user_data):
    """Tests successfully submitting a report."""
    food_id = available_food_post["id"]
    reporter_net_id = other_user_data["netId"]
    poster_net_id = available_food_post["posterNetId"] # Should be test_user
    payload = {
        "postId": food_id,
        "message": f"Test report message {time.time()}",
        "user1Id": reporter_net_id, # Reporter
        "user2Id": poster_net_id, # Poster being reported
    }

    # Get initial report count from DB
    from database import food_collection
    item_before = food_collection.find_one({"_id": ObjectId(food_id)})
    initial_count = item_before.get("reportCount", 0) if item_before else 0

    response = client.post("/api/report", data=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    json_response = response.json()
    assert json_response["message"] == "Report submitted successfully"
    assert "report_id" in json_response
    assert ObjectId.is_valid(json_response["report_id"])

    # Verify report count incremented in DB
    item_after = food_collection.find_one({"_id": ObjectId(food_id)})
    assert item_after is not None
    assert item_after.get("reportCount", 0) == initial_count + 1

    # Verify report exists in DB
    from database import report_collection
    report = report_collection.find_one({"_id": ObjectId(json_response["report_id"])})
    assert report is not None
    assert report["postId"] == food_id
    assert report["user1ID"] == reporter_net_id
    assert report["user2ID"] == poster_net_id

def test_submit_report_post_not_found(client, other_user_data, test_user_data):
    """Tests submitting a report for a non-existent food post."""
    payload = {
        "postId": str(ObjectId()), # Non-existent post ID
        "message": "This post doesn't exist.",
        "user1Id": other_user_data["netId"],
        "user2Id": test_user_data["netId"],
    }
    response = client.post("/api/report", data=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Food post not found"

def test_submit_report_invalid_post_id_format(client, other_user_data, test_user_data):
    """Tests submitting a report with an invalid postId format."""
    payload = {
        "postId": "invalid-id-format",
        "message": "Invalid post ID.",
        "user1Id": other_user_data["netId"],
        "user2Id": test_user_data["netId"],
    }
    response = client.post("/api/report", data=payload)
    assert response.status_code == 400
    assert "Invalid postId format" in response.json()["detail"]

def test_submit_report_missing_data(client, available_food_post, other_user_data):
    """Tests submitting a report with missing form data (e.g., message)."""
    payload = {
        "postId": available_food_post["id"],
       # "message": "Missing message", # Message missing
        "user1Id": other_user_data["netId"],
        "user2Id": available_food_post["posterNetId"],
    }
    response = client.post("/api/report", data=payload)
    assert response.status_code == 422 # FastAPI Form validation
    assert any(d['loc'] == ['body', 'message'] for d in response.json()["detail"])


# == GET /api/reports ==
def test_get_reports_success(client, reported_food_post):
    """Tests retrieving all reports."""
    # reported_food_post fixture ensures at least one report exists
    response = client.get("/api/reports")
    assert response.status_code == 200
    json_response = response.json()
    assert isinstance(json_response, list)
    assert len(json_response) >= 1
    # Check structure of the first report
    first_report = json_response[0]
    assert "id" in first_report and isinstance(first_report["id"], str)
    assert "_id" not in first_report
    assert "postId" in first_report
    assert "user1ID" in first_report
    assert "user2ID" in first_report
    assert "message" in first_report
    assert "reviewStatus" in first_report
    assert "submittedAt" in first_report

# == PUT /api/report/{report_id} ==
def test_update_report_status_success(client, reported_food_post):
    """Tests successfully updating the status of a report."""
    report_id = reported_food_post["reportId"]
    admin_id = f"admin_{time.time()}"
    payload = {
        "status": "resolved",
        "admin_id": admin_id
    }
    response = client.put(f"/api/report/{report_id}", data=payload)
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json()["message"] == "Report status updated successfully"

    # Verify status update in DB
    from database import report_collection
    report = report_collection.find_one({"_id": ObjectId(report_id)})
    assert report is not None
    assert report["reviewStatus"] == "resolved"
    assert report["reviewedBy"] == admin_id
    assert isinstance(report["reviewedAt"], datetime)

def test_update_report_status_not_found(client):
    """Tests updating a non-existent report."""
    report_id = str(ObjectId())
    payload = {"status": "dismissed", "admin_id": "admin_tester"}
    response = client.put(f"/api/report/{report_id}", data=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Report not found"

def test_update_report_status_invalid_id(client):
    """Tests updating a report with an invalid report_id format."""
    payload = {"status": "dismissed", "admin_id": "admin_tester"}
    response = client.put("/api/report/invalid-report-id", data=payload)
    assert response.status_code == 400
    assert "Invalid report_id format" in response.json()["detail"]

def test_update_report_status_invalid_status_value(client, reported_food_post):
    """Tests updating a report with an invalid status value."""
    report_id = reported_food_post["reportId"]
    payload = {"status": "invalid_status_xyz", "admin_id": "admin_tester"}
    response = client.put(f"/api/report/{report_id}", data=payload)
    assert response.status_code == 400
    assert "Invalid status value" in response.json()["detail"]

def test_update_report_status_missing_data(client, reported_food_post):
    """Tests updating a report with missing form data."""
    report_id = reported_food_post["reportId"]
    payload_no_status = {"admin_id": "admin_tester"}
    response = client.put(f"/api/report/{report_id}", data=payload_no_status)
    assert response.status_code == 422
    assert any(d['loc'] == ['body', 'status'] for d in response.json()["detail"])

    payload_no_admin = {"status": "resolved"}
    response = client.put(f"/api/report/{report_id}", data=payload_no_admin)
    assert response.status_code == 422
    assert any(d['loc'] == ['body', 'admin_id'] for d in response.json()["detail"])


# == GET /api/report/can-report/{post_id}/{user_id} ==
def test_can_report_success(client, available_food_post, other_user_data):
    """Tests if a user (who hasn't reported) can report a post (not their own)."""
    post_id = available_food_post["id"]
    user_id = other_user_data["netId"] # User wanting to report
    response = client.get(f"/api/report/can-report/{post_id}/{user_id}")
    assert response.status_code == 200, f"Response: {response.text}"
    assert response.json() == {"canReport": True, "reason": None}

def test_can_report_own_post(client, available_food_post):
    """Tests if a user can report their own post (should be false)."""
    post_id = available_food_post["id"]
    user_id = available_food_post["posterNetId"] # The poster themselves
    response = client.get(f"/api/report/can-report/{post_id}/{user_id}")
    assert response.status_code == 200 # API returns 200 with canReport=False
    assert response.json() == {"canReport": False, "reason": "You cannot report your own post"}

def test_can_report_already_reported(client, reported_food_post):
    """Tests if a user who already reported can report again (should be false)."""
    post_id = reported_food_post["foodId"]
    user_id = reported_food_post["reporterNetId"] # The user who already reported
    response = client.get(f"/api/report/can-report/{post_id}/{user_id}")
    assert response.status_code == 200
    assert response.json() == {"canReport": False, "reason": "You have already reported this post"}

def test_can_report_post_not_found(client, test_user_data):
    """Tests can-report check for a non-existent post."""
    post_id = str(ObjectId())
    user_id = test_user_data["netId"]
    response = client.get(f"/api/report/can-report/{post_id}/{user_id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Food post not found"

def test_can_report_invalid_post_id(client, test_user_data):
    """Tests can-report check with an invalid post_id format."""
    post_id = "invalid-post-id"
    user_id = test_user_data["netId"]
    response = client.get(f"/api/report/can-report/{post_id}/{user_id}")
    assert response.status_code == 400
    assert "Invalid post_id format" in response.json()["detail"]

# == GET /api/test-report ==
def test_get_test_report_endpoint(client):
    """Tests the endpoint that creates and returns a test report."""
    response = client.get("/api/test-report")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["success"] is True
    assert "report_id" in json_response
    assert ObjectId.is_valid(json_response["report_id"])
    assert "inserted_report" in json_response
    # Check some fields in the inserted report
    report_data = json_response["inserted_report"]
    assert "This is a test report generated at" in report_data["message"]
    assert report_data["reviewStatus"] == "pending"
    assert report_data["user1ID"].startswith("test_reporter_")
