from fastapi import APIRouter, Form, HTTPException, Depends
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import ValidationError
from datetime import datetime
import logging
from typing import List, Optional # Import List for response model

# Import necessary components
from database import get_report_collection, get_food_collection
from models import Report, ReportCreate, CanReportResponse # Import relevant models

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/report", # Matches the primary report endpoint structure
    tags=["Reports"],
)

# Separate router for endpoints outside the /api/report prefix but report-related
misc_report_router = APIRouter(tags=["Reports Misc"])

# Dependency functions
def get_report_db() -> Collection:
    return get_report_collection()

def get_food_db() -> Collection: # Needed for checking post existence and report counts
    return get_food_collection()

# --- Endpoints ---

@router.post("") # Corresponds to POST /api/report
async def submit_report(
    postId: str = Form(...), # Refers to food post _id
    message: str = Form(...),
    user1Id: str = Form(...), # User submitting the report (netId?)
    user2Id: str = Form(...), # User being reported (poster's netId?)
    report_db: Collection = Depends(get_report_db),
    food_db: Collection = Depends(get_food_db)
):
    logger.info(f"Received report submission: postId={postId}, reporter={user1Id}, reportedUser={user2Id}")
    try:
        post_object_id = ObjectId(postId)
    except InvalidId:
        logger.warning(f"Invalid postId format received for reporting: {postId}")
        raise HTTPException(status_code=400, detail=f"Invalid postId format: {postId}")

    # Check if the food post exists before proceeding
    food_post = food_db.find_one({"_id": post_object_id}, {"_id": 1}) # Just check existence
    if not food_post:
        logger.warning(f"Food post not found for reporting: postId={postId}")
        raise HTTPException(status_code=404, detail="Food post not found, cannot submit report.")


    try:
        # Use the ReportCreate model potentially (adjust if needed)
        report_data = {
            "postId": postId, # Store the string version as in original
            "user1ID": str(user1Id),
            "user2ID": str(user2Id),
            "message": message,
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None,
            "reviewedAt": None,
        }

        result = report_db.insert_one(report_data)
        report_id = result.inserted_id
        logger.info(f"Report inserted with ID: {report_id} for postId: {postId}")

        # Increment report count on the food post atomically
        update_result = food_db.update_one(
            {"_id": post_object_id},
            {"$inc": {"reportCount": 1}}
        )

        if update_result.matched_count == 0:
             # This is unlikely given the check above, but log if it happens
             logger.error(f"Failed to find food post {postId} to increment report count after report {report_id} was inserted.")
        else:
            logger.info(f"Incremented report count for postId {postId}. Modified count: {update_result.modified_count}")


        return {"message": "Report submitted successfully", "report_id": str(report_id)}

    except HTTPException as he:
        raise he
    except Exception as e:
        # If insert fails, should we rollback the report count increment? (More complex tx needed)
        logger.error(f"Unexpected error processing report for postId {postId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred while processing the report.")

@misc_report_router.get("/api/reports", response_model=List[Report]) # Full path
async def get_reports(db: Collection = Depends(get_report_db)):
    logger.info("Received request to get all reports.")
    try:
        reports_cursor = db.find()
        reports_list = []
        for report in reports_cursor:
            report["id"] = str(report.pop("_id"))
            # Check if the keys exist and are not None before converting
            if "user1ID" in report and report["user1ID"] is not None:
                 report["user1ID"] = str(report["user1ID"])
            if "user2ID" in report and report["user2ID"] is not None:
                 report["user2ID"] = str(report["user2ID"])
            report.setdefault("reviewedAt", None)
            reports_list.append(report)
            

        logger.info(f"Returning {len(reports_list)} reports.")
        return reports_list # Pydantic validates against List[Report]
    except ValidationError as ve:
         logger.error(f"Validation error formatting reports response: {ve}", exc_info=True)
         raise HTTPException(status_code=500, detail="Error formatting report data.")
    except Exception as e:
        logger.error(f"Error fetching reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching reports.")


@router.put("/{report_id}") # Corresponds to PUT /api/report/{report_id}
async def update_report_status(
    report_id: str,
    status: str = Form(...), # Should this be a Body or Query param? Form implies HTML form. Using Form to match original.
    admin_id: str = Form(...), # ID of the admin performing the action
    db: Collection = Depends(get_report_db)
):
    logger.info(f"Received request to update report {report_id} status to {status} by admin {admin_id}")

    try:
        report_object_id = ObjectId(report_id)
    except InvalidId:
        logger.warning(f"Invalid report_id format for update: {report_id}")
        raise HTTPException(status_code=400, detail=f"Invalid report_id format: {report_id}")

    # Optional: Validate 'status' value against allowed statuses (e.g., "resolved", "dismissed")
    allowed_statuses = ["pending", "resolved", "dismissed", "action_taken"] # Example
    if status not in allowed_statuses:
         logger.warning(f"Invalid status '{status}' provided for report update {report_id}")
         raise HTTPException(status_code=400, detail=f"Invalid status value. Must be one of: {', '.join(allowed_statuses)}")


    try:
        update_data = {
            "reviewStatus": status,
            "reviewedBy": admin_id,
            "reviewedAt": datetime.now()
        }
        result = db.update_one(
            {"_id": report_object_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            logger.warning(f"Report not found for status update: reportId={report_id}")
            raise HTTPException(status_code=404, detail="Report not found")

        if result.modified_count > 0:
             logger.info(f"Report {report_id} status updated successfully to {status} by admin {admin_id}")
        else:
             logger.info(f"Report {report_id} status was already {status}. No update performed.")


        return {"message": "Report status updated successfully"} # Original response

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating report status for report {report_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating report status.")


@router.get("/can-report/{post_id}/{user_id}", response_model=CanReportResponse)
async def can_report(
    post_id: str,
    user_id: str, # NetID of the user wanting to report
    report_db: Collection = Depends(get_report_db),
    food_db: Collection = Depends(get_food_db)
):
    logger.info(f"Checking 'can-report': postId={post_id}, userId={user_id}")
    try:
        post_object_id = ObjectId(post_id)
    except InvalidId:
        logger.warning(f"Invalid post_id format for can_report check: {post_id}")
        raise HTTPException(status_code=400, detail=f"Invalid post_id format: {post_id}")

    try:
        # Check if post exists and who posted it
        food_post = food_db.find_one({"_id": post_object_id}, {"postedBy": 1})
        if not food_post:
            logger.warning(f"Food post not found for can_report check: postId={post_id}")
            # Decide if 404 is appropriate or if canReport should be False
            # Returning 404 seems better as the resource doesn't exist.
            raise HTTPException(status_code=404, detail="Food post not found")

        if food_post.get("postedBy") == user_id:
            logger.info(f"User {user_id} cannot report own post {post_id}.")
            return {"canReport": False, "reason": "You cannot report your own post"}

        # Check if this user (user_id) has already reported this post (post_id)
        # Use the string version of postId as stored in the reports collection
        existing_report = report_db.find_one({"postId": post_id, "user1ID": user_id}, {"_id": 1})

        if existing_report:
            logger.info(f"User {user_id} has already reported post {post_id}.")
            return {"canReport": False, "reason": "You have already reported this post"}

        # If none of the above conditions met, user can report
        logger.info(f"User {user_id} can report post {post_id}.")
        return {"canReport": True, "reason": None}

    except HTTPException as he:
        raise he
    except ValidationError as ve: # If response model validation fails
        logger.error(f"Validation error formatting can_report response: {ve}")
        raise HTTPException(status_code=500, detail="Error formatting response data.")
    except Exception as e:
        logger.error(f"Error during can_report check for post {post_id}, user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while checking report eligibility.")


# Test endpoint - Keep on misc router? Or main app?
# Let's keep it separate on misc_report_router
@misc_report_router.get("/api/test-report") # Full path
async def test_report(report_db: Collection = Depends(get_report_db)):
    logger.info("Received request for /api/test-report endpoint.")
    try:
        # Create unique test data
        timestamp_str = str(int(datetime.now().timestamp()))
        test_post_id = f"test_post_id_{timestamp_str}"

        test_report_data = {
            "postId": test_post_id,
            "user1ID": "test_reporter_" + timestamp_str,
            "user2ID": "test_poster_" + timestamp_str,
            "message": "This is a test report generated at " + datetime.now().isoformat(),
            "isSubmitted": True,
            "submittedAt": datetime.now(),
            "reviewStatus": "pending",
            "reviewedBy": None,
            "reviewedAt": None,
        }
        result = report_db.insert_one(test_report_data)
        inserted_id = result.inserted_id
        logger.info(f"Test report inserted with id: {inserted_id}")

        # Retrieve the inserted report to confirm and return
        inserted_report = report_db.find_one({"_id": inserted_id})

        if not inserted_report:
             logger.error("Failed to retrieve newly inserted test report.")
             # Return error in the original format for this specific test endpoint
             return {"success": False, "error": "Failed to retrieve inserted test report"}

        # Prepare response, converting _id
        response_report = {k: v for k, v in inserted_report.items()}
        response_report["id"] = str(response_report.pop("_id"))
        # Convert datetime for JSON if needed
        if isinstance(response_report.get("submittedAt"), datetime):
            response_report["submittedAt"] = response_report["submittedAt"].isoformat()

        return {
            "success": True,
            "report_id": str(inserted_id),
            "inserted_report": response_report # Return the full report data
        }
    except Exception as e:
        logger.error(f"Error in /api/test-report: {e}", exc_info=True)
        return {"success": False, "error": str(e)} # Match original error format
