import hashlib
import logging

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """Hashes a password using SHA256."""
    try:
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    except Exception as e:
        logger.error(f"Error hashing password: {e}", exc_info=True)
        raise ValueError("Could not hash password") # Or handle differently

def verify_password(stored_password_hash: str, provided_password: str) -> bool:
    """Verifies a provided password against a stored hash."""
    try:
        provided_hash = hash_password(provided_password)
        return stored_password_hash == provided_hash
    except Exception as e:
        logger.error(f"Error verifying password: {e}", exc_info=True)
        return False # Fail verification on error