import pytest
import hashlib
from unittest.mock import patch, MagicMock
import utils # Assuming your utils.py is in the same directory or can be imported like this

def test_hash_password_exception_handling():
    """
    Tests the exception handling in the hash_password function.
    Covers the red lines in the except block of hash_password.
    """
    # We need to make the hashlib.sha256 call raise an exception
    with patch('utils.hashlib.sha256') as mock_sha256:
        mock_sha256.side_effect = Exception("Simulated hashing error")

        with pytest.raises(ValueError, match="Could not hash password"):
            utils.hash_password("test_password")

def test_verify_password_exception_handling():
    """
    Tests the exception handling in the verify_password function.
    Covers the red lines in the except block of verify_password.
    """
    # We need to make the internal call to hash_password raise an exception
    with patch('utils.hash_password') as mock_hash_password:
        mock_hash_password.side_effect = Exception("Simulated hashing error during verification")

        stored_hash = hashlib.sha256(b"correct_password").hexdigest()
        provided_password = "wrong_password" # The exact password doesn't matter here

        # The function should catch the exception and return False
        assert utils.verify_password(stored_hash, provided_password) is False
