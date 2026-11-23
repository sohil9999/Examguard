import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from extensions import db

load_dotenv()

admin_name = os.getenv("ADMIN_NAME")
admin_email = os.getenv("ADMIN_EMAIL")
admin_password = os.getenv("ADMIN_PASSWORD")

if not admin_name or not admin_email or not admin_password:
    print("Admin credentials are missing from .env")
    raise SystemExit(1)

admin_email = admin_email.lower().strip()

# Check whether this email already exists
existing_admin = db.users.find_one({"email": admin_email})

if existing_admin:
    print("An account with this email already exists.")
    raise SystemExit(1)

# Create admin account
admin = {
    "name": admin_name,
    "email": admin_email,
    "password": generate_password_hash(admin_password),
    "role": "admin"
}

db.users.insert_one(admin)

print("Admin account created successfully!")