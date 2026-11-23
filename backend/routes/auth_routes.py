from flask import Blueprint, request, jsonify
from bson import ObjectId
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from extensions import db

auth_bp = Blueprint("auth", __name__)


# STUDENT REGISTRATION
@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email", "").lower().strip()
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({
            "message": "All fields are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "message": "Password must contain at least 8 characters"
        }), 400

    existing_user = db.users.find_one({
        "email": email
    })

    if existing_user:
        return jsonify({
            "message": "Email already registered"
        }), 409

    hashed_password = generate_password_hash(password)

    user = {
        "name": name.strip(),
        "email": email,
        "password": hashed_password,
        "role": "student"
    }

    db.users.insert_one(user)

    return jsonify({
        "message": "Registration successful"
    }), 201


# STUDENT LOGIN
@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json() or {}

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = db.users.find_one({
        "email": email,
        "role": "student"
    })

    if not user or not check_password_hash(
        user["password"], password
    ):
        return jsonify({
            "message": "Invalid email or password"
        }), 401

    access_token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={
            "role": "student"
        },
        expires_delta=timedelta(hours=2)
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "name": user["name"]
    }), 200


# ADMIN LOGIN
@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():

    try:
        data = request.get_json() or {}

        email = data.get("email", "").lower().strip()
        password = data.get("password", "")

        print("ADMIN LOGIN: Request received")

        admin = db.users.find_one({
            "email": email,
            "role": "admin"
        })

        print("ADMIN LOGIN: Database query completed")
        print("ADMIN LOGIN: Admin found:", admin is not None)

        if not admin:
            return jsonify({
                "message": "Admin account not found"
            }), 401

        password_valid = check_password_hash(
            admin["password"], password
        )

        print("ADMIN LOGIN: Password verification completed")

        if not password_valid:
            return jsonify({
                "message": "Invalid admin password"
            }), 401

        access_token = create_access_token(
            identity=str(admin["_id"]),
            additional_claims={"role": "admin"},
            expires_delta=timedelta(hours=2)
        )

        print("ADMIN LOGIN: JWT generated successfully")

        return jsonify({
            "message": "Admin login successful",
            "access_token": access_token,
            "name": admin.get("name", "Admin")
        }), 200

    except Exception as e:
        print("ADMIN LOGIN ERROR:", repr(e))

        return jsonify({
            "message": "Admin login failed",
            "error": str(e)
        }), 500

    data = request.get_json() or {}

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    admin = db.users.find_one({
        "email": email,
        "role": "admin"
    })

    if not admin or not check_password_hash(admin["password"], password):
        return jsonify({
            "message": "Invalid admin email or password"
        }), 401

    access_token = create_access_token(
        identity=str(admin["_id"]),
        additional_claims={"role": "admin"},
        expires_delta=timedelta(hours=2)
    )

    return jsonify({
        "message": "Admin login successful",
        "access_token": access_token,
        "name": admin["name"]
    }), 200


# ADMIN - GET TOTAL REGISTERED STUDENTS
@auth_bp.route("/admin/students/count", methods=["GET"])
@jwt_required()
def get_student_count():

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "message": "Admin access required"
        }), 403

    total_students = db.users.count_documents({
        "role": "student"
    })

    return jsonify({
        "total_students": total_students
    }), 200
# ADMIN - GET ALL REGISTERED STUDENTS
@auth_bp.route("/admin/students", methods=["GET"])
@jwt_required()
def get_all_students():

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "message": "Admin access required"
        }), 403

    students = list(
        db.users.find(
            {"role": "student"},
            {
                "password": 0
            }
        ).sort("name", 1)
    )

    student_list = []

    for student in students:
        student_list.append({
            "id": str(student["_id"]),
            "name": student.get("name", ""),
            "email": student.get("email", "")
        })

    return jsonify({
        "students": student_list,
        "total_students": len(student_list)
    }), 200


# ADMIN - DELETE STUDENT ACCOUNT
@auth_bp.route("/admin/students/<student_id>", methods=["DELETE"])
@jwt_required()
def delete_student(student_id):

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "message": "Admin access required"
        }), 403

    if not ObjectId.is_valid(student_id):
        return jsonify({
            "message": "Invalid student ID"
        }), 400

    result = db.users.delete_one({
        "_id": ObjectId(student_id),
        "role": "student"
    })

    if result.deleted_count == 0:
        return jsonify({
            "message": "Student not found"
        }), 404

    return jsonify({
        "message": "Student deleted successfully"
    }), 200