from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.models.teacher_model import Teacher
import datetime

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({"message": "Missing required fields"}), 400

    if Teacher.find_by_username(data['username']) or Teacher.find_by_email(data['email']):
        return jsonify({"message": "User already exists"}), 400

    Teacher.create_teacher(data['username'], data['password'], data['email'])
    return jsonify({"message": "Teacher registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"message": "Missing username or password"}), 400

    teacher = Teacher.find_by_username(data['username'])
    if not teacher or not Teacher.verify_password(data['password'], teacher['password']):
        return jsonify({"message": "Invalid username or password"}), 401

    expires = datetime.timedelta(days=7)
    access_token = create_access_token(
        identity=str(teacher['_id']),
        additional_claims={"role": "teacher", "username": teacher['username']},
        expires_delta=expires
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "username": teacher['username'],
        "role": "teacher"
    }), 200

@auth_bp.route('/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "authenticated": True,
        "user_id": current_user_id,
        "username": claims.get("username"),
        "role": claims.get("role")
    }), 200
