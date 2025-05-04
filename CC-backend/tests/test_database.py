import pytest
import os
from unittest.mock import patch, MagicMock
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.mongo_client import MongoClient
import sys

# --- Path Setup ---
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# --- Module Import ---
# Import specific functions and variables to test or mock
try:
    from database import (
        connect_db,
        get_food_collection,
        get_report_collection,
        get_users_collection,
        client as db_client_instance, # Access the module-level client instance
        db as db_instance,
        food_collection as food_coll_instance,
        report_collection as report_coll_instance,
        users_collection as users_coll_instance
    )
except ImportError:
    pytest.exit("Could not import from 'database'. Ensure database.py exists and path is correct.", 1)


# --- Test Functions ---

# Note: These tests assume the MONGO_URI is set in the environment for the test run,
#       similar to how the application runs. Fixtures in conftest.py handle the actual connection.

def test_get_collections_return_type():
    """Tests that the getter functions return Collection objects after connection."""
    # Relies on the session setup in conftest.py to have called connect_db()
    assert isinstance(get_food_collection(), Collection)
    assert isinstance(get_report_collection(), Collection)
    assert isinstance(get_users_collection(), Collection)

def test_get_collections_idempotency():
    """Tests that calling getter functions multiple times returns the same instance."""
    food_coll_1 = get_food_collection()
    food_coll_2 = get_food_collection()
    assert food_coll_1 is food_coll_2

    report_coll_1 = get_report_collection()
    report_coll_2 = get_report_collection()
    assert report_coll_1 is report_coll_2

    users_coll_1 = get_users_collection()
    users_coll_2 = get_users_collection()
    assert users_coll_1 is users_coll_2

def test_database_module_variables_initialized():
    """Tests that the module-level variables are set after connection."""
    # Relies on session setup in conftest.py
    connect_db() # Ensure connection is attempted (it's idempotent)
    assert isinstance(db_client_instance, MongoClient)
    assert isinstance(db_instance, Database)
    assert isinstance(food_coll_instance, Collection)
    assert isinstance(report_coll_instance, Collection)
    assert isinstance(users_coll_instance, Collection)
    # Check collection names (adjust if different in your DB)
    assert food_coll_instance.name == "food_posts"
    assert report_coll_instance.name == "reports"
    assert users_coll_instance.name == "users"

@patch('database.MongoClient') # Mock the MongoClient class
@patch('database.os.getenv')   # Mock os.getenv
def test_connect_db_missing_uri(mock_getenv, mock_mongo_client):
    """Tests connect_db behavior when MONGO_URI is not set."""
    # Configure mocks
    mock_getenv.return_value = None # Simulate MONGO_URI not being set

    # Reset module variables to force re-connection attempt
    # This is tricky as they are module-level globals. Need to be careful.
    # A better approach might be to structure database.py with classes or functions
    # that don't rely solely on module globals for state.
    # For now, we test the exception raising.
    with patch('database.client', None), \
         patch('database.db', None), \
         patch('database.food_collection', None), \
         patch('database.report_collection', None), \
         patch('database.users_collection', None):
        with pytest.raises(ValueError, match="MONGO_URI environment variable not set"):
            connect_db()

    mock_getenv.assert_called_once_with("MONGO_URI")
    mock_mongo_client.assert_not_called() # MongoClient should not be instantiated

@patch('database.MongoClient')
@patch('database.os.getenv')
def test_connect_db_connection_error(mock_getenv, mock_mongo_client):
    """Tests connect_db behavior when MongoClient fails."""
    # Configure mocks
    mock_getenv.return_value = "mongodb://fake_uri" # Provide a fake URI
    mock_mongo_client.side_effect = Exception("Connection Failed") # Simulate connection error

    with patch('database.client', None), \
         patch('database.db', None), \
         patch('database.food_collection', None), \
         patch('database.report_collection', None), \
         patch('database.users_collection', None):
        with pytest.raises(RuntimeError, match="Failed to connect to MongoDB: Connection Failed"):
            connect_db()

    mock_getenv.assert_called_once_with("MONGO_URI")
    mock_mongo_client.assert_called_once_with("mongodb://fake_uri", tls=True, tlsAllowInvalidCertificates=True)

# Test the lazy connection part of get_... functions
@patch('database.connect_db') # Mock the connect_db function itself
def test_get_collection_calls_connect_db_if_needed(mock_connect_db):
    """Tests that getter functions call connect_db if collection is None."""
    # Simulate collections not being initialized
    with patch('database.food_collection', None):
        get_food_collection()
        mock_connect_db.assert_called_once()

    mock_connect_db.reset_mock() # Reset call count for the next check

    with patch('database.report_collection', None):
        get_report_collection()
        mock_connect_db.assert_called_once()

    mock_connect_db.reset_mock()

    with patch('database.users_collection', None):
        get_users_collection()
        mock_connect_db.assert_called_once()

    # Test that connect_db is NOT called if collection is already set
    mock_connect_db.reset_mock()
    # Assume collections are set (by previous calls or setup)
    get_food_collection()
    get_report_collection()
    get_users_collection()
    mock_connect_db.assert_not_called() # Should not be called again if already initialized
