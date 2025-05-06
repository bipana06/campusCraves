from pydantic import BaseModel, EmailStr # Use EmailStr for validation
from typing import Optional, List
from datetime import datetime
from bson import ObjectId # Import ObjectId here if needed for custom types

# Helper for ObjectId serialization if needed in models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")



# --- Report Models ---
class ReportBase(BaseModel):
    postId: str # Keep as string if it refers to the string version of ObjectId
    user1ID: str
    user2ID: str
    message: str
    isSubmitted: bool = True

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: Optional[str] = None # Keep simple string if manually converting in endpoint
    submittedAt: datetime
    reviewStatus: str = "pending"
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[datetime] = None # Added from update logic

    class Config:
        orm_mode = True
        extra = "allow" # Allow extra fields from DB
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()} # Handle datetime


# --- User Models ---
class UserBase(BaseModel):
    email: EmailStr # Use Pydantic's EmailStr for validation
    netId: str
    fullName: str
    phoneNumber: Optional[str] = None
    picture: Optional[str] = None # Typically a URL

class UserRegistration(UserBase):
    googleId: str # Keep if still used alongside Net ID registration

class UserCreate(UserBase): # For email/password signup
    username: str
    password: str # Handled separately for hashing

class User(UserBase): # Represents user data returned (excluding password)
    id: Optional[str] = None # Keep simple string if manually converting
    googleId: Optional[str] = None # Make optional if not always present
    username: Optional[str] = None # Make optional if not always present
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    lastLogin: Optional[datetime] = None
    role: str = "user"
    postCount: int = 0
    reservationCount: int = 0

    class Config:
        orm_mode = True
        extra = "allow"
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}

class UserEmailLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleIdRequest(BaseModel):
    googleId: str

class EmailCheckRequest(BaseModel):
    email: EmailStr

# Models for specific responses if needed
class NetIdResponse(BaseModel):
    netId: str

class CanReportResponse(BaseModel):
    canReport: bool
    reason: Optional[str] = None

class UserCheckResponse(User): # Inherits from User model
    pass

class UserProfileResponse(BaseModel):
    username: str
    email: EmailStr
    profilePicture: Optional[str] = None
    post_count: int
    received_count: int
    post_history: List # List[Food] if Food model is defined
    received_history: List # List[Food] if Food model is defined