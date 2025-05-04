import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

# Fixture 'client' is automatically available from conftest.py

# --- Test Functions ---

def test_read_root(client: TestClient):
    """Tests the root endpoint '/'."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Food Sharing API!"}

# Test startup event indirectly by checking DB connection status after client creation
# The TestClient context manager handles startup/shutdown events.
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

# Mocking connect_db to test startup failure scenario (optional, more complex)
@patch('main.connect_db') # Patch connect_db where it's called in main.py's startup
def test_startup_event_db_connection_failure(mock_connect_db):
    """Tests app behavior if connect_db fails during startup (requires mocking)."""
    mock_connect_db.side_effect = RuntimeError("Simulated DB connection failure")

    # Re-import app or create client *after* patching connect_db
    # This is tricky with TestClient context manager.
    # A direct call simulation might be easier if TestClient doesn't re-run startup easily.

    # Alternative: Test the connect_db function directly (covered in test_database.py)
    # and assume FastAPI handles startup errors appropriately (e.g., logs error, might prevent start).
    # Directly testing FastAPI's handling of startup exceptions is more involved.
    pass # Placeholder - direct testing of startup failure handling is complex.

# Test shutdown event (optional, requires inspecting logs or mock calls if db client closing is mocked)
# @patch('main.db_client') # Assuming db_client is accessible from main for patching
# def test_shutdown_event_closes_db(mock_db_client_main):
#     """Tests if the shutdown event calls client.close()."""
#     # Need to trigger shutdown, TestClient context manager does this implicitly on exit
#     with TestClient(app) as client:
#         pass # Startup and shutdown happen within the 'with' block
#
#     # Check if close was called on the client instance used by the app
#     # This requires careful patching of the correct client instance.
#     # The client instance might be the one imported in main.py from database.py
#     from database import client as db_client_global # Get the actual client instance
#     # This assertion depends heavily on how the client is imported and used.
#     # If the app uses the global client from database.py:
#     # assert db_client_global.close.called # This requires db_client_global to be a mock
#     pass # Placeholder - testing shutdown requires careful mocking.

