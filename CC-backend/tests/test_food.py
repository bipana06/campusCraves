import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
import json
import time


# == POST /api/food ==
def test_post_food_success(client, test_user_data):
   """Tests successful food post creation."""
   run_timestamp = time.time()
   data = {
       "foodName": f"Test Apple Pie {run_timestamp}", "quantity": 1, "category": "Dessert",
       "dietaryInfo": "Contains gluten, dairy", "pickupLocation": "NYUAD C1",
       "pickupTime": datetime.now().isoformat(),
       "photo": json.dumps({"uri": f"data:image/jpeg;base64,{run_timestamp}"}), # Unique photo data
       "user": test_user_data["netId"],
       "expirationTime": (datetime.now() + timedelta(hours=2)).isoformat(),
       "createdAt": datetime.now().isoformat(),
   }
   response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
   assert response.status_code == 200, f"Response: {response.text}"
   json_response = response.json()
   assert "food_id" in json_response
   assert ObjectId.is_valid(json_response["food_id"])
   assert json_response["message"] == "Food post created successfully"


def test_post_food_missing_required_field(client, test_user_data):
   """Tests posting food with a missing required form field."""
   data = { "quantity": "1", "category": "Dessert", "dietaryInfo": "None",
            "pickupLocation": "NYUAD C2", "pickupTime": datetime.now().isoformat(),
            "photo": json.dumps({"uri": "data:image/png;base64,..."}),
            "user": test_user_data["netId"],
            "expirationTime": (datetime.now() + timedelta(hours=3)).isoformat(),
            "createdAt": datetime.now().isoformat() } # Missing foodName
   response = client.post("/api/food", data=data)
   assert response.status_code == 422
   assert any(d['loc'] == ['body', 'foodName'] for d in response.json()["detail"])


def test_post_food_invalid_quantity_type(client, test_user_data):
   """Tests posting food with invalid data type for quantity."""
   data = { "foodName": "Test Bad Quantity Pie", "quantity": "abc", # Invalid int
            "category": "Dessert", "dietaryInfo": "None", "pickupLocation": "NYUAD C3",
            "pickupTime": datetime.now().isoformat(),
            "photo": json.dumps({"uri": "data:image/gif;base64,..."}),
            "user": test_user_data["netId"],
            "expirationTime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "createdAt": datetime.now().isoformat() }
   response = client.post("/api/food", data=data)
   assert response.status_code == 422
   assert "Input should be a valid integer" in response.json()["detail"][0]["msg"]


def test_post_food_invalid_photo_json(client, test_user_data):
   """Tests posting food with invalid JSON in the photo field."""
   data = { "foodName": "Test Bad Photo Pie", "quantity": 1, "category": "Dessert",
            "dietaryInfo": "None", "pickupLocation": "NYUAD C4",
            "pickupTime": datetime.now().isoformat(), "photo": '{"uri": "incomplete', # Invalid JSON
            "user": test_user_data["netId"],
            "expirationTime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "createdAt": datetime.now().isoformat() }
   response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
   assert response.status_code == 422 # Validation error from endpoint logic
   assert "Photo field must be a valid JSON string" in response.json()["detail"]


# == GET /api/food ==
def test_get_food_success(client, available_food_post):
   """Tests retrieving all food posts."""
   # available_food_post fixture ensures at least one item exists
   response = client.get("/api/food")
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert isinstance(json_response["food_posts"], list)
   assert len(json_response["food_posts"]) >= 1 # Should have at least the fixture item
   # Check structure of the first item
   first_item = json_response["food_posts"][0]
   assert "id" in first_item and isinstance(first_item["id"], str)
   assert "_id" not in first_item
   assert "foodName" in first_item
   assert "status" in first_item
   assert "photo" in first_item and isinstance(first_item["photo"], str)
   # Check if photo URI was extracted (or original string if invalid)
   assert first_item["photo"].startswith("data:image") or first_item["photo"] == ""


# == POST /api/food/reserve ==
def test_reserve_food_success(client, available_food_post, other_user_data):
   """Tests successfully reserving an available food post."""
   food_id = available_food_post["id"]
   reserver_net_id = other_user_data["netId"]
   payload = {"food_id": food_id, "user": reserver_net_id}


   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 200, f"Response: {response.text}"
   json_response = response.json()
   assert json_response["message"] == "Food item reserved successfully"
   assert json_response["food_id"] == food_id
   assert json_response["reservedBy"] == reserver_net_id


def test_reserve_food_not_found(client, other_user_data):
   """Tests reserving a non-existent food post."""
   payload = {"food_id": str(ObjectId()), "user": other_user_data["netId"]}
   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 404
   assert response.json()["detail"] == "Food item not found"


def test_reserve_food_invalid_id_format(client, other_user_data):
   """Tests reserving with an invalid food_id format."""
   payload = {"food_id": "this-is-not-an-objectid", "user": other_user_data["netId"]}
   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 400
   assert "Invalid food_id format" in response.json()["detail"]


def test_reserve_food_already_reserved(client, reserved_food_post, test_user_data):
   """Tests reserving a post that is already reserved."""
   food_id = reserved_food_post["id"]
   # Attempt reservation by a different user (test_user_data)
   payload = {"food_id": food_id, "user": test_user_data["netId"]}
   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 400
   assert response.json()["detail"] == "Food item is already reserved"


def test_reserve_food_already_completed(client, completed_food_post, test_user_data):
   """Tests reserving a post that has already been completed."""
   food_id = completed_food_post["id"]
   payload = {"food_id": food_id, "user": test_user_data["netId"]}
   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 400
   assert "no longer available" in response.json()["detail"]


def test_reserve_food_missing_data(client):
   """Tests reserving with missing user or food_id in payload."""
   payload_no_user = {"food_id": str(ObjectId())}
   response = client.post("/api/food/reserve", json=payload_no_user)
   assert response.status_code == 400
   assert response.json()["detail"] == "food_id and user are required"


   payload_no_id = {"user": "some_user_netid"}
   response = client.post("/api/food/reserve", json=payload_no_id)
   assert response.status_code == 400
   assert response.json()["detail"] == "food_id and user are required"


# == POST /api/food/complete ==
def test_complete_transaction_success(client, reserved_food_post):
   """Tests successfully completing a reserved transaction."""
   food_id = reserved_food_post["id"]
   reserver_net_id = reserved_food_post["reserverNetId"]
   payload = {"food_id": food_id, "user": reserver_net_id} # Send as form data


   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 200, f"Response: {response.text}"
   json_response = response.json()
   assert json_response["message"] == "Transaction completed successfully"
   assert json_response["food_id"] == food_id
   assert json_response["status"] == "red"


def test_complete_transaction_not_found(client, test_user_data):
   """Tests completing a non-existent transaction."""
   payload = {"food_id": str(ObjectId()), "user": test_user_data["netId"]}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 404
   assert response.json()["detail"] == "Food item not found"


def test_complete_transaction_invalid_id_format(client, test_user_data):
   """Tests completing with an invalid food_id format."""
   payload = {"food_id": "invalid-id-format", "user": test_user_data["netId"]}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 400
   assert "Invalid food_id format" in response.json()["detail"]


def test_complete_transaction_not_authorized(client, reserved_food_post, test_user_data):
   """Tests completing by a user who did not reserve the item."""
   food_id = reserved_food_post["id"]
   # Attempt completion with test_user_data (who didn't reserve it)
   payload = {"food_id": food_id, "user": test_user_data["netId"]}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 403
   assert "not authorized to complete this transaction" in response.json()["detail"]


def test_complete_transaction_not_reserved(client, available_food_post, test_user_data):
   """Tests completing a transaction that is not in 'reserved' status."""
   food_id = available_food_post["id"] # Item is 'green' (available)
   payload = {"food_id": food_id, "user": test_user_data["netId"]}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 400
   assert "Item is not in reserved status" in response.json()["detail"]


def test_complete_transaction_already_completed(client, completed_food_post):
   """Tests completing a transaction that is already completed ('red')."""
   food_id = completed_food_post["id"]
   reserver_net_id = completed_food_post["reserverNetId"]
   payload = {"food_id": food_id, "user": reserver_net_id}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 400
   assert "Item is not in reserved status" in response.json()["detail"]


def test_complete_transaction_missing_data(client):
   """Tests completing with missing form data."""
   payload_no_user = {"food_id": str(ObjectId())}
   response = client.post("/api/food/complete", data=payload_no_user)
   assert response.status_code == 422 # FastAPI validation error for missing form field
   assert any(d['loc'] == ['body', 'user'] for d in response.json()["detail"])


   payload_no_id = {"user": "some_user"}
   response = client.post("/api/food/complete", data=payload_no_id)
   assert response.status_code == 422
   assert any(d['loc'] == ['body', 'food_id'] for d in response.json()["detail"])




# == GET /api/food/search ==
def test_search_food_by_name(client, available_food_post):
   """Tests searching food by name."""
   # Get the name of the created post
   from database import food_collection # Import here for direct access
   item = food_collection.find_one({"_id": ObjectId(available_food_post["id"])})
   assert item is not None
   food_name = item["foodName"]
   search_term = food_name.split(" ")[0] # Search for the first word


   params = {"foodName": search_term}
   response = client.get("/api/food/search", params=params)
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response and isinstance(json_response["food_posts"], list)
   assert len(json_response["food_posts"]) >= 1
   # Check if the search term is in the name of the first result
   assert search_term.lower() in json_response["food_posts"][0]["foodName"].lower()


def test_search_food_by_category(client, available_food_post):
   """Tests searching food by category."""
   params = {"category": "Meal"} # Category from available_food_post fixture
   response = client.get("/api/food/search", params=params)
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert len(json_response["food_posts"]) >= 1
   assert json_response["food_posts"][0]["category"] == "Meal"


def test_search_food_by_location(client, available_food_post):
   """Tests searching food by pickup location."""
   params = {"pickupLocation": "Somewhere"} # Location from available_food_post
   response = client.get("/api/food/search", params=params)
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert len(json_response["food_posts"]) >= 1
   assert json_response["food_posts"][0]["pickupLocation"] == "Somewhere"


def test_search_food_multiple_criteria(client, available_food_post):
   """Tests searching with multiple criteria."""
   params = {"category": "Meal", "pickupLocation": "Somewhere"}
   response = client.get("/api/food/search", params=params)
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert len(json_response["food_posts"]) >= 1
   assert json_response["food_posts"][0]["category"] == "Meal"
   assert json_response["food_posts"][0]["pickupLocation"] == "Somewhere"


def test_search_food_no_results(client):
   """Tests a search query that yields no results."""
   params = {"foodName": f"NonExistentFoodItemXYZ_{time.time()}"}
   response = client.get("/api/food/search", params=params)
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert len(json_response["food_posts"]) == 0


def test_search_food_no_criteria(client, available_food_post):
   """Tests search with no criteria, should return all (like GET /api/food)."""
   # available_food_post ensures there's at least one item
   response = client.get("/api/food/search")
   assert response.status_code == 200
   json_response = response.json()
   assert "food_posts" in json_response
   assert len(json_response["food_posts"]) >= 1 # Should return the available post




# == GET /api/food/poster-netid/{food_id} ==
def test_get_poster_netid_success(client, available_food_post):
   """Tests retrieving the poster's netId for a food post."""
   food_id = available_food_post["id"]
   expected_poster_netid = available_food_post["posterNetId"]
   response = client.get(f"/api/food/poster-netid/{food_id}")
   assert response.status_code == 200, f"Response: {response.text}"
   assert response.json() == {"netId": expected_poster_netid}


def test_get_poster_netid_not_found(client):
   """Tests retrieving poster netId for a non-existent post."""
   response = client.get(f"/api/food/poster-netid/{str(ObjectId())}")
   assert response.status_code == 404
   assert response.json()["detail"] == "Food post not found"


def test_get_poster_netid_invalid_id(client):
   """Tests retrieving poster netId with an invalid food_id format."""
   response = client.get("/api/food/poster-netid/invalid-id-format")
   assert response.status_code == 400
   assert "Invalid food_id format" in response.json()["detail"]
def test_post_food_internal_server_error(monkeypatch, client, test_user_data):
   """Forces an internal error during food post creation."""
   def mock_insert_one_fail(*args, **kwargs):
       raise Exception("Simulated DB failure")


   from database import food_collection
   monkeypatch.setattr(food_collection, "insert_one", mock_insert_one_fail)


   data = {
       "foodName": "Error Pie", "quantity": 1, "category": "Test",
       "dietaryInfo": "None", "pickupLocation": "Lab",
       "pickupTime": datetime.now().isoformat(),
       "photo": json.dumps({"uri": "data:image/jpg;base64,..."}),
       "user": test_user_data["netId"],
       "expirationTime": (datetime.now() + timedelta(hours=1)).isoformat(),
       "createdAt": datetime.now().isoformat()
   }
   response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
   assert response.status_code == 500
   assert "unexpected error" in response.json()["detail"].lower()


def test_get_food_internal_server_error(monkeypatch, client):
   from database import get_food_collection
   monkeypatch.setattr(get_food_collection(), "find", lambda *_: (_ for _ in ()).throw(Exception("DB crash")))
   response = client.get("/api/food")
   assert response.status_code == 500
   assert "unexpected error" in response.json()["detail"].lower()


def test_post_food_internal_server_error(monkeypatch, client, test_user_data):
   # Simulate DB.insert_one failing
   from database import get_food_collection
   monkeypatch.setattr(get_food_collection(), "insert_one", lambda *_: (_ for _ in ()).throw(Exception("DB down")))
   payload = {}
   response = client.post("/api/food", data={k: str(v) for k, v in payload.items()})
   assert response.status_code == 422


class DummyResult:
   modified_count = 0


def test_reserve_food_conflict_unexpected(monkeypatch, client, available_food_post, other_user_data):
   from database import get_food_collection
   db = get_food_collection()


   # Always return green item
   monkeypatch.setattr(db, "find_one", lambda *_: { "_id": ObjectId(available_food_post["id"]), "status": "green", "reservedBy":"None" })
   monkeypatch.setattr(db, "update_one", lambda *_: DummyResult())


   payload = {"food_id": available_food_post["id"], "user": other_user_data["netId"]}
   response = client.post("/api/food/reserve", json=payload)
   assert response.status_code == 500
   assert "unexpected conflict" in response.json()["detail"].lower()
  
  
def test_complete_transaction_conflict(monkeypatch, client, reserved_food_post):
   from database import get_food_collection
   db = get_food_collection()
   # Step 1: initial find returns yellow+correct user
   monkeypatch.setattr(db, "find_one", lambda *args, **kwargs: {
       "_id": ObjectId(reserved_food_post["id"]),
       "status": "yellow",
       "reservedBy": reserved_food_post["reserverNetId"]
   })
   # Step 2: update_one says no rows touched
   class DummyRes: modified_count = 0
   monkeypatch.setattr(db, "update_one", lambda *_: DummyRes())
   # Step 3: subsequent find_one returns state-changed
   def find_one_late(*args, **kwargs):
       return {"_id": ObjectId(reserved_food_post["id"]), "status": "red", "reservedBy": reserved_food_post["reserverNetId"]}
   monkeypatch.setattr(db, "find_one", find_one_late)


   payload = {"food_id": reserved_food_post["id"], "user": reserved_food_post["reserverNetId"]}
   response = client.post("/api/food/complete", data=payload)
   assert response.status_code == 400
   assert "transaction cannot be completed. item is not in reserved status." in response.json()["detail"].lower()




def test_get_food_photo_json_decode_failure(monkeypatch, client, available_food_post):
   """If a stored photo field isn’t valid JSON, the endpoint should still return something sensible."""
   from database import get_food_collection
   fake_docs = [{
       "_id": ObjectId(available_food_post["id"]),
       "foodName": "Broken Photo",
       "quantity": 1,
       "category": "Test",
       "dietaryInfo": "",
       "pickupLocation": "Nowhere",
       "pickupTime": datetime.now(),
       "photo": "not-json-at-all",
       "status": "green",
       "user": "u1",
       "expirationTime": datetime.now(),
       "createdAt": datetime.now()
   }]
   # make .find() return our fake doc
   monkeypatch.setattr(get_food_collection(), "find", lambda *args, **kwargs: fake_docs)
   response = client.get("/api/food")
   assert response.status_code == 200
   first = response.json()["food_posts"][0]
   # should not crash, and should give raw string back
   assert first["photo"] == "not-json-at-all"


def test_reserve_food_internal_server_error(monkeypatch, client, available_food_post, other_user_data):
   """If anything unexpected happens during reserve, should return 500."""
   from database import get_food_collection
   db = get_food_collection()
   # make find_one blow up
   monkeypatch.setattr(db, "find_one", lambda *args, **kw: (_ for _ in ()).throw(Exception("boom")))
   payload = {"food_id": available_food_post["id"], "user": other_user_data["netId"]}
   resp = client.post("/api/food/reserve", json=payload)
   assert resp.status_code == 500
   assert "unexpected error" in resp.json()["detail"].lower()


def test_complete_transaction_internal_server_error(monkeypatch, client, reserved_food_post):
   """Unexpected exception in complete should give 500."""
   from database import get_food_collection
   db = get_food_collection()
   # make initial find_one work, but update_one throw
   monkeypatch.setattr(db, "find_one", lambda *args, **kw: {
       "_id": ObjectId(reserved_food_post["id"]),
       "status": "yellow",
       "reservedBy": reserved_food_post["reserverNetId"]
   })
   monkeypatch.setattr(db, "update_one", lambda *args, **kw: (_ for _ in ()).throw(Exception("oops")))
   payload = {"food_id": reserved_food_post["id"], "user": reserved_food_post["reserverNetId"]}
   resp = client.post("/api/food/complete", data=payload)
   assert resp.status_code == 500
   assert "unexpected error" in resp.json()["detail"].lower()
  
def test_search_food_internal_server_error(monkeypatch, client):
   """If DB.find blows up in /search, should return 500."""
   from database import get_food_collection
   monkeypatch.setattr(get_food_collection(), "find", lambda *args, **kw: (_ for _ in ()).throw(Exception()))
   resp = client.get("/api/food/search", params={"foodName": "anything"})
   assert resp.status_code == 500
   assert "unexpected error" in resp.json()["detail"].lower()




def test_get_poster_netid_internal_server_error(monkeypatch, client, available_food_post):
   """Simulate an unexpected crash fetching the poster netId."""
   from database import get_food_collection
   monkeypatch.setattr(get_food_collection(), "find_one", lambda *args, **kw: (_ for _ in ()).throw(Exception()))
   resp = client.get(f"/api/food/poster-netid/{available_food_post['id']}")
   assert resp.status_code == 500
   assert "unexpected error" in resp.json()["detail"].lower()
def test_post_food_all_fields_missing_returns_422(client):
   """No form data should trigger FastAPI’s validation error (422)."""
   resp = client.post("/api/food", data={})
   assert resp.status_code == 422
   # It should list each required field in detail
   expected_fields = {"foodName","quantity","category","dietaryInfo",
                      "pickupLocation","pickupTime","photo",
                      "user","expirationTime","createdAt"}
   returned = {d["loc"][-1] for d in resp.json()["detail"]}
   assert expected_fields.issubset(returned)
def test_post_food_with_valid_photo_and_dates(client, test_user_data):
   """Covers expirationTime and createdAt handling in /api/food."""
   timestamp = datetime.now()
   data = {
       "foodName": "Coverage Boost Pie",
       "quantity": 2,
       "category": "Fruit",
       "dietaryInfo": "Vegan",
       "pickupLocation": "Library Cafe",
       "pickupTime": timestamp.isoformat(),
       "photo": json.dumps({"uri": "data:image/png;base64,xyz"}),
       "user": test_user_data["netId"],
       "expirationTime": (timestamp + timedelta(hours=1)).isoformat(),
       "createdAt": timestamp.isoformat(),
   }
   response = client.post("/api/food", data={k: str(v) for k, v in data.items()})
   assert response.status_code == 200
   assert "food_id" in response.json()


def test_reserve_food_status_changed_during_update(monkeypatch, client, available_food_post, other_user_data):
   """Simulates race condition where food status changed mid-reservation."""


   from database import get_food_collection
   db = get_food_collection()
   food_id = available_food_post["id"]
   netid = other_user_data["netId"]


   # Step 1: initial find returns green
   monkeypatch.setattr(db, "find_one", lambda *args, **kwargs: {
       "_id": ObjectId(food_id),
       "status": "green",
       "reservedBy": "None"
   })


   # Step 2: update_one returns modified_count = 0 (i.e., did not update)
   class DummyRes: modified_count = 0
   monkeypatch.setattr(db, "update_one", lambda *_: DummyRes())


   # Step 3: second find shows status changed to 'yellow'
   def refreshed_find_one(*args, **kwargs):
       return {
           "_id": ObjectId(food_id),
           "status": "yellow",
           "reservedBy": "someone_else"
       }
   monkeypatch.setattr(db, "find_one", refreshed_find_one)


   payload = {"food_id": food_id, "user": netid}
   response = client.post("/api/food/reserve", json=payload)


   assert response.status_code == 400
   assert "food item is already reserved" in response.json()["detail"].lower()




def test_complete_transaction_state_changed(monkeypatch, client, reserved_food_post):
   """Covers fallback error if food status or reserver changes mid-completion."""


   from database import get_food_collection
   db = get_food_collection()
   food_id = reserved_food_post["id"]
   netid = reserved_food_post["reserverNetId"]


   # Step 1: initial find shows correct status/user
   monkeypatch.setattr(db, "find_one", lambda *args, **kwargs: {
       "_id": ObjectId(food_id),
       "status": "yellow",
       "reservedBy": netid
   })


   # Step 2: update_one returns modified_count = 0 (nothing changed)
   class DummyRes: modified_count = 0
   monkeypatch.setattr(db, "update_one", lambda *_: DummyRes())


   # Step 3: refreshed find returns changed state
   def refreshed_find_one(*args, **kwargs):
       return {
           "_id": ObjectId(food_id),
           "status": "green",  # Not yellow anymore
           "reservedBy": "someone_else"
       }
   monkeypatch.setattr(db, "find_one", refreshed_find_one)


   payload = {"food_id": food_id, "user": netid}
   response = client.post("/api/food/complete", data=payload)


   assert response.status_code == 400


def test_get_poster_netid_missing_posted_by(monkeypatch, client, available_food_post):
   """Covers case where 'postedBy' field is missing in the DB document."""


   from database import get_food_collection
   db = get_food_collection()


   monkeypatch.setattr(db, "find_one", lambda *args, **kwargs: {
       "_id": ObjectId(available_food_post["id"])
   })


   response = client.get(f"/api/food/poster-netid/{available_food_post['id']}")
   assert response.status_code == 404
   assert "poster information not found" in response.json()["detail"].lower()



