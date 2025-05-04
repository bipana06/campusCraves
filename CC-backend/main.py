from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# Import routers and other necessary components
from database import connect_db, client # Import client for shutdown event
from routers import food, users, reports # Import main routers
from routers.users import misc_user_router # Import misc routers if they have endpoints outside main prefix
from routers.reports import misc_report_router

# Configure logger (can be moved to a dedicated logging config file)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Create FastAPI app ---
app = FastAPI(
    title="Food Sharing API",
    description="API for managing food posts, users, and reports.",
    version="1.0.0" # Optional: API versioning
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Configure specific origins in production
    allow_credentials=True,
    allow_methods=["*"], # Allow specific methods
    allow_headers=["*"], # Allow specific headers
)

# --- Event Handlers ---
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application...")
    try:
        connect_db() # Establish database connection on startup
        logger.info("Database connection established.")
    except Exception as e:
        logger.error(f"Failed to connect to database on startup: {e}", exc_info=True)
        # Decide if the app should fail to start if DB connection fails
        # raise RuntimeError("Database connection failed on startup") from e

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down FastAPI application...")
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

# --- Include Routers ---
# Include the main routers with their defined prefixes
app.include_router(food.router)
app.include_router(users.router)
app.include_router(reports.router)

# Include routers that define full paths (endpoints not under the main prefixes)
app.include_router(users.misc_user_router)
app.include_router(reports.misc_report_router)


# --- Root Endpoint (Optional) ---
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Food Sharing API!"}

# --- Add any root-level endpoints here if needed ---
# Example for the potentially redundant /check-email endpoint:
# from models import EmailCheckRequest
# from database import get_users_collection
# from fastapi import Depends
# from pymongo.collection import Collection
#
# @app.post("/check-email", tags=["Misc"])
# async def root_check_email(data: EmailCheckRequest, db: Collection = Depends(get_users_collection)):
#     """Checks if an email exists (Root level endpoint)."""
#     logger.info(f"Checking email at root level: {data.email}")
#     user = db.find_one({"email": data.email}, {"_id": 1})
#     return {"exists": bool(user)}


# --- Run with Uvicorn (for local development) ---
# This part is typically not included in the main.py when deploying
# if __name__ == "__main__":
#     import uvicorn
#     port = int(os.getenv("PORT", 8000)) # Default to 8000 if PORT env var not set
#     uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)