from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "examguard")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

db = client[DATABASE_NAME]

def initialize_database():
    client.admin.command("ping")
    print("MongoDB Connected Successfully!")