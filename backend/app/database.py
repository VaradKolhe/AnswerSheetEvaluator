import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name: str = "grading_db"

settings = Settings()

client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]

async def get_database():
    return db
