import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

# --- Test Functions ---

def test_read_root(client: TestClient):
    """Tests the root endpoint '/'."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Food Sharing API!"}


def test_startup_event_connects_db(client: TestClient):
    """
    Tests if the startup event successfully connects to the database.
    Relies on the TestClient fixture triggering the startup event.
    We check by ensuring database getters work.
    """
    # Import getters here to ensure they use the state potentially set by startup
    from database import get_food_collection, get_report_collection, get_users_collection
    from pymongo.collection import Collection

    # If these getters work without raising errors, it implies connect_db succeeded during startup.
    try:
        assert isinstance(get_food_collection(), Collection)
        assert isinstance(get_report_collection(), Collection)
        assert isinstance(get_users_collection(), Collection)
    except Exception as e:
        pytest.fail(f"Database collection getters failed after app startup: {e}")



from unittest.mock import patch
from fastapi.testclient import TestClient

def test_shutdown_event_closes_db():
    from main import app
    with patch('main.client') as mock_client:
        with TestClient(app):
            pass  # Startup and shutdown happen here
        assert mock_client.close.called

def test_food_router_smoke(client: TestClient):
    response = client.get("/food")  # Adjust path as per your API
    assert response.status_code in (200, 404, 401)  # Acceptable status depending on auth

def test_users_router_smoke(client: TestClient):
    response = client.get("/users")
    assert response.status_code in (200, 404, 401)

def test_reports_router_smoke(client: TestClient):
    response = client.get("/reports")
    assert response.status_code in (200, 404, 401)
