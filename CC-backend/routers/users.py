from fastapi import APIRouter, HTTPException, Depends, Body
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
from pydantic import ValidationError # Keep if used
from datetime import datetime
import logging
import json


# Import necessary components
from database import get_users_collection, get_food_collection
from models import (
    UserRegistration, UserCreate, UserEmailLogin, User, GoogleIdRequest,
    EmailCheckRequest, NetIdResponse, UserCheckResponse, UserProfileResponse,
    PyObjectId # Import PyObjectId if used in models
)
from utils import hash_password, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/users", # Base prefix for user-related routes
    tags=["Users"],
)

# Separate router for endpoints outside the /api/users prefix but user-related
# Or handle them within this router using full path overrides
misc_user_router = APIRouter(tags=["Users Misc"])


# Dependency function
def get_user_db() -> Collection:
    return get_users_collection()

def get_food_db() -> Collection: # Needed for profile endpoint
    return get_food_collection()


# --- Endpoints under /api/users ---

@router.post("/signup") # Corresponds to POST /api/users/signup
async def signup(user: UserCreate, db: Collection = Depends(get_user_db)):
    logger.info(f"Received signup request for email: {user.email}, username: {user.username}")
    try:
        # Check existing email
        if db.find_one({"email": user.email}):
            logger.warning(f"Signup attempt with existing email: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered. Please log in or use a different email.")

        # Check existing username
        if db.find_one({"username": user.username}):
            logger.warning(f"Signup attempt with existing username: {user.username}")
            raise HTTPException(status_code=400, detail="Username already exists. Please choose another one.")

        # Check existing netId
        if db.find_one({"netId": user.netId}):
             logger.warning(f"Signup attempt with existing netId: {user.netId}")
             raise HTTPException(status_code=409, detail="This Net ID is already registered.")

        hashed_password = hash_password(user.password)

        new_user_data = {
            "username": user.username,
            "email": user.email,
            "password": hashed_password,
            "netId": user.netId,
            "googleId": user.netId,  # Populate googleId with netId for potential compatibility
            "fullName": user.fullName,
            "phoneNumber": user.phoneNumber,
            "picture": user.picture,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "role": "user",
            "postCount": 0, # Initialize counts
            "reservationCount": 0,
            "lastLogin": None
        }

        result = db.insert_one(new_user_data)
        if result.inserted_id:
            logger.info(f"User {user.username} ({user.netId}) registered successfully.")
            # Exclude password from response if returning user data
            # return {"success": True, "message": "User registered successfully", "user_id": str(result.inserted_id)}
            return {"success": True, "message": "User registered successfully"} # Match original response
        else:
            logger.error(f"Failed to insert user {user.username} into database.")
            raise HTTPException(status_code=500, detail="Failed to register user due to a database issue.")

    except HTTPException as he:
        raise he
    except DuplicateKeyError as dke: # Catch potential race conditions if indices exist
         logger.error(f"Duplicate key error during signup for user {user.username}: {dke}")
         # Determine which field caused it if possible
         detail = "A unique field (like email, username, or Net ID) already exists."
         if "email" in str(dke): detail = "Email already registered."
         elif "username" in str(dke): detail = "Username already exists."
         elif "netId" in str(dke): detail = "This Net ID is already registered."
         raise HTTPException(status_code=409, detail=detail)
    except ValidationError as ve: # If Pydantic validation fails upstream (shouldn't happen here)
        logger.error(f"Validation error during signup: {ve}")
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during signup for user {user.username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during signup.")


@router.post("/email-login") # Corresponds to POST /api/users/email-login
async def email_login(user: UserEmailLogin, db: Collection = Depends(get_user_db)):
    logger.info(f"Received email login attempt for: {user.email}")
    try:
        db_user = db.find_one({"email": user.email})

        if not db_user:
            logger.warning(f"Login failed: Email not found - {user.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if "password" not in db_user or not verify_password(db_user["password"], user.password):
            logger.warning(f"Login failed: Invalid password for email - {user.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login time
        now = datetime.now()
        db.update_one({"_id": db_user["_id"]}, {"$set": {"lastLogin": now}})

        # Prepare user response (exclude password)
        user_response_data = {k: v for k, v in db_user.items() if k != "password"}
        user_response_data["id"] = str(user_response_data.pop("_id")) # Use 'id' field
        # Ensure datetime fields are serializable if not handled by model
        if isinstance(user_response_data.get("createdAt"), datetime):
            user_response_data["createdAt"] = user_response_data["createdAt"].isoformat()
        if isinstance(user_response_data.get("updatedAt"), datetime):
            user_response_data["updatedAt"] = user_response_data["updatedAt"].isoformat()
        user_response_data["lastLogin"] = now.isoformat() # Add updated login time

        # Validate response against User model if desired
        # user_response = User(**user_response_data)

        logger.info(f"User {user.email} logged in successfully.")
        return {
            "success": True,
            "message": "Login successful",
            "user": user_response_data # Return the dict directly
            # "user": user_response.dict(by_alias=True) # If using Pydantic model validation
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error during email login for {user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during login.")


# Original code had /api/users/auth-check using UserEmailLogin but checking username?
# Assuming it should check email like the login endpoint. Clarify if username needed.
# Replicating original logic (checking username from UserEmailLogin which has email):
# This seems flawed. If it's truly an auth check based on existing session/token,
# the logic would be different (e.g., verifying a JWT).
# If it's just another login form check, it duplicates /email-login.
# Let's keep it but log a warning.
@router.post("/auth-check") # Corresponds to POST /api/users/auth-check
async def auth_check(user: UserEmailLogin, db: Collection = Depends(get_user_db)):
    logger.warning(f"Executing /api/users/auth-check endpoint. Logic may need review. Checking email: {user.email}")
    # Replicating the logic from /api/users/email-login for consistency
    try:
        db_user = db.find_one({"email": user.email})

        if not db_user or "password" not in db_user or not verify_password(db_user["password"], user.password):
            logger.info(f"Auth check failed for email: {user.email}")
            # Original returned 401 JSONResponse, using HTTPException now
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Prepare user response (exclude password)
        user_response_data = {k: v for k, v in db_user.items() if k != "password"}
        user_response_data["id"] = str(user_response_data.pop("_id"))
        if isinstance(user_response_data.get("createdAt"), datetime):
            user_response_data["createdAt"] = user_response_data["createdAt"].isoformat()
        if isinstance(user_response_data.get("updatedAt"), datetime):
            user_response_data["updatedAt"] = user_response_data["updatedAt"].isoformat()
        if isinstance(user_response_data.get("lastLogin"), datetime):
             user_response_data["lastLogin"] = user_response_data["lastLogin"].isoformat()


        logger.info(f"Auth check successful for email: {user.email}")
        return {
            "success": True,
            "user": user_response_data
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error during auth check for {user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during auth check.")


@router.post("/register") # Corresponds to POST /api/users/register (Google/NetID registration)
async def register_user(user: UserRegistration, db: Collection = Depends(get_user_db)):
    logger.info(f"Received user registration/update request via Google/NetID: googleId={user.googleId}, netId={user.netId}")
    try:
        # Check if user exists by googleId FIRST (as per original logic flow)
        existing_user_google = db.find_one({"googleId": user.googleId})

        if existing_user_google:
            logger.info(f"Updating existing user found by googleId: {user.googleId} (NetID: {existing_user_google.get('netId')})")
            update_data = {
                # Original logic allowed updating netId here. This seems risky.
                # If a user logs in via Google, should their netId be updatable?
                # Commenting out netId update, adjust if needed.
                # "netId": user.netId,
                "fullName": user.fullName,
                "phoneNumber": user.phoneNumber,
                "picture": user.picture,
                "updatedAt": datetime.now()
            }
            # Remove None values to avoid overwriting existing data with None
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if not update_data: # No actual changes provided
                logger.info(f"No update needed for user {user.googleId}.")
                return {"success": True, "message": "User data is already up to date."}

            result = db.update_one({"_id": existing_user_google["_id"]}, {"$set": update_data})
            logger.info(f"User {user.googleId} updated. Modified count: {result.modified_count}")
            return {"success": True, "message": "User updated successfully"}

        # If no user by googleId, check for NetID conflict BEFORE creating
        existing_user_netid = db.find_one({"netId": user.netId})
        if existing_user_netid:
            # User exists with this NetID but different/no Google ID. Conflict.
            logger.warning(f"Registration conflict: Net ID {user.netId} already registered, but Google ID {user.googleId} not found.")
            # Potentially link Google ID here? Or raise conflict. Original raises conflict.
            raise HTTPException(status_code=409, detail="This Net ID is already registered (potentially with a different login method).")

        # Create new user if no conflicts
        logger.info(f"Creating new user for googleId: {user.googleId}, netId: {user.netId}")
        user_data = user.dict() # Get data from Pydantic model
        user_data["createdAt"] = datetime.now()
        user_data["updatedAt"] = datetime.now()
        user_data["role"] = "user"
        user_data["postCount"] = 0
        user_data["reservationCount"] = 0
        user_data["lastLogin"] = None
        # Ensure password field is not included or is handled if required by schema
        user_data.pop("password", None) # Remove if present in base model

        result = db.insert_one(user_data)
        if result.inserted_id:
            logger.info(f"User {user.netId} (Google: {user.googleId}) registered successfully with id: {result.inserted_id}")
            return {"success": True, "message": "User registered successfully"}
        else:
            logger.error(f"Failed to register user {user.netId}: insert_one returned no ID.")
            raise HTTPException(status_code=500, detail="Failed to register user due to an unexpected database issue.")

    except HTTPException as he:
        raise he
    except DuplicateKeyError as dke:
         logger.error(f"Duplicate key error during registration for netId {user.netId} or googleId {user.googleId}: {dke}")
         detail = "User registration conflict (duplicate key)."
         if "netId_1" in str(dke): # Check index name if available
             detail = "This Net ID is already registered (duplicate key)."
         elif "googleId_1" in str(dke):
             detail = "This Google ID is already registered (duplicate key)."
         raise HTTPException(status_code=409, detail=detail)
    except Exception as e:
        logger.error(f"Unexpected error during registration for netId {user.netId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during user registration.")

# Use response_model=User to validate output structure
@router.get("/{googleId}", response_model=User) # Corresponds to GET /api/users/{googleId}
async def get_user(googleId: str, db: Collection = Depends(get_user_db)):
    logger.info(f"Received request to get user by googleId: {googleId}")
    try:
        user = db.find_one({"googleId": googleId})
        if not user:
            logger.warning(f"User not found for googleId: {googleId}")
            raise HTTPException(status_code=404, detail="User not found")

        # Convert _id to id for the Pydantic model
        user["id"] = str(user.pop("_id"))
        validated_user = User(**user) #addition
        return validated_user

        # Pydantic will validate and convert fields (like datetime) based on the User model
        # return user

    except HTTPException as he:
        raise he # Re-raise 404
    except ValidationError as ve:
         logger.error(f"Validation error constructing user response for {googleId}: {ve}")
         raise HTTPException(status_code=500, detail="Error formatting user data.")
    except Exception as e:
        logger.error(f"Error fetching user by googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching user data.")


# Profile endpoint needs net_id, which might be different from the /api/users prefix logic
# Option 1: Keep it here with full path
# Option 2: Move to a different router (like misc_user_router)
# Option 3: Change the path to fit /api/users/{net_id}/profile (RESTful)
# Keeping original path structure for compatibility:
# Need to adjust the router prefix or use the misc_user_router.
# Let's use misc_user_router for endpoints not fitting the /api/users prefix naturally.

@misc_user_router.get("/api/users/profile/{net_id}", response_model=UserProfileResponse) # Full path specified
async def get_user_profile(
    net_id: str,
    user_db: Collection = Depends(get_user_db),
    food_db: Collection = Depends(get_food_db)
):
    logger.info(f"Received request for user profile: netId={net_id}")
    try:
        user = user_db.find_one({"netId": net_id})
        if not user:
            logger.warning(f"User profile not found: netId={net_id}")
            raise HTTPException(status_code=404, detail="User not found")

   
        logger.info(f"Found user {net_id}, fetching profile data.")

        # Counts
        post_count = food_db.count_documents({"postedBy": net_id})
        # Count 'received' based on being reservedBy and status is 'red' (completed)
        received_count = food_db.count_documents({"reservedBy": net_id, "status": "red"})

        # Histories (Consider adding limits and pagination later)
        post_history_cursor = food_db.find({"postedBy": net_id}).sort("timestamp", -1).limit(50) # Limit results
        post_history = []
        for post in post_history_cursor:
            post["id"] = str(post.pop("_id"))
            # Process photo URI
            if "photo" in post and isinstance(post["photo"], str):
                try: post["photo"] = json.loads(post["photo"]).get("uri", post["photo"])
                except json.JSONDecodeError: pass # Keep original if invalid JSON
            else: post["photo"] = post.get("photo", "")
            # Convert datetime
            if isinstance(post.get("timestamp"), datetime): post["timestamp"] = post["timestamp"].isoformat()
            post_history.append(post)

        # Assuming received means transaction completed (status=red)
        received_history_cursor = food_db.find({"reservedBy": net_id, "status": "red"}).sort("timestamp", -1).limit(50) # Limit results
        received_history = []
        for received in received_history_cursor:
            received["id"] = str(received.pop("_id"))
             # Process photo URI
            if "photo" in received and isinstance(received["photo"], str):
                try: received["photo"] = json.loads(received["photo"]).get("uri", received["photo"])
                except json.JSONDecodeError: pass
            else: received["photo"] = received.get("photo", "")
            # Convert datetime
            if isinstance(received.get("timestamp"), datetime): received["timestamp"] = received["timestamp"].isoformat()
            received_history.append(received)


        # Prepare response using UserProfileResponse model
        response_data = {
            "username": user.get("fullName"), # Use fullName as username? Check requirement
            "email": user.get("email"),
            "profilePicture": user.get("picture", ""),
            "post_count": post_count,
            "received_count": received_count,
            "post_history": post_history,
            "received_history": received_history,
        }

        logger.info(f"Successfully fetched profile data for netId: {net_id}")
        return response_data # Pydantic will validate against UserProfileResponse

    except HTTPException as he:
         raise he
    except ValidationError as ve:
        logger.error(f"Validation error constructing profile response for {net_id}: {ve}")
        raise HTTPException(status_code=500, detail="Error formatting profile data.")
    except Exception as e:
        logger.error(f"Error fetching profile details for netId {net_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching profile data.")


# Endpoint for checking user existence by Google ID
# Needs to be on the misc router as it doesn't fit /api/users prefix
@misc_user_router.post("/api/users/check", response_model=UserCheckResponse) # Full path
async def check_user(request: GoogleIdRequest, db: Collection = Depends(get_user_db)):
    googleId = request.googleId
    logger.info(f"Received user check request for googleId: {googleId}")
    try:
        user = db.find_one({"googleId": googleId})
        if not user:
            logger.info(f"User check: User not found for googleId: {googleId}")
            raise HTTPException(status_code=404, detail="User not found")

        user["id"] = str(user.pop("_id"))
        logger.info(f"User check: Found user for googleId: {googleId}")
        # Pydantic validates against UserCheckResponse (which inherits from User)
        return user
    except HTTPException as he:
         raise he
    except ValidationError as ve:
        logger.error(f"Validation error constructing user check response for {googleId}: {ve}")
        raise HTTPException(status_code=500, detail="Error formatting user check data.")
    except Exception as e:
        logger.error(f"Error checking user by googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during user check.")


# Endpoint to get NetID from Google ID
# Needs to be on the misc router
@misc_user_router.get("/api/users/netid/{googleId}", response_model=NetIdResponse) # Full path
async def get_user_by_googleId(googleId: str, db: Collection = Depends(get_user_db)):
    logger.info(f"Received request to get netId for googleId: {googleId}")
    try:
        user = db.find_one({"googleId": googleId}, {"netId": 1}) # Projection
        if not user:
            logger.warning(f"User not found when fetching netId for googleId: {googleId}")
            raise HTTPException(status_code=404, detail="User not found")

        net_id = user.get("netId")
        if not net_id:
            logger.error(f"User found for googleId {googleId} but is missing the netId field.")
            raise HTTPException(status_code=500, detail="User data incomplete (missing Net ID).")

        logger.info(f"Found netId '{net_id}' for googleId: {googleId}")
        return {"netId": net_id} # Pydantic validates against NetIdResponse

    except HTTPException as he:
        raise he
    except ValidationError as ve:
        logger.error(f"Validation error constructing netid response for {googleId}: {ve}")
        raise HTTPException(status_code=500, detail="Error formatting netid data.")
    except Exception as e:
        logger.error(f"Error fetching netId for googleId {googleId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching netId.")

# Endpoint to check if an email exists
# This was defined twice in the original code with different paths.
# Using the /api/users prefix seems more appropriate.
@router.post("/check-email") # Corresponds to POST /api/users/check-email
async def check_email(data: EmailCheckRequest, db: Collection = Depends(get_user_db)):
    logger.info(f"Checking existence of email: {data.email}")
    try:
        user = db.find_one({"email": data.email}, {"_id": 1}) # Only need to know if it exists
        exists = bool(user)
        logger.info(f"Email check result for {data.email}: {'Exists' if exists else 'Does not exist'}")
        return {"exists": exists}
    except Exception as e:
        logger.error(f"Error checking email {data.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while checking email existence.")


