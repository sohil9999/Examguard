from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

from extensions import db, initialize_database

load_dotenv()

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# JWT
jwt = JWTManager(app)

# CORS
CORS(app)

# Database connection
initialize_database()

# Authentication routes
from routes.auth_routes import auth_bp

app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)
from routes.exam_routes import exam_bp
app.register_blueprint(exam_bp, url_prefix="/api/exams")

@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to ExamGuard!",
        "status": "Backend Running"
    })


@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "database": "connected"
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)