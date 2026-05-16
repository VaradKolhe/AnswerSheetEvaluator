from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse
from app.services.auth import get_password_hash, verify_password, create_access_token, decode_access_token
from app.database import db
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    user = await db.teachers.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate):
    existing_user = await db.teachers.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_in.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["id"] = str(uuid.uuid4())
    
    await db.teachers.insert_one(user_dict)
    
    # Generate token for immediate login
    access_token = create_access_token(data={"sub": user_dict["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await db.teachers.find_one({"email": user_in.email})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {**current_user, "id": current_user["id"]}
