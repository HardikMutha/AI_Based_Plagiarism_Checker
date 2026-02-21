import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI")
    OPENALEX_EMAIL = os.getenv("OPENALEX_EMAIL")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key")
    IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")
    SERPAPI_KEY = os.getenv("SERPAPI_KEY")
    # Change this in production!