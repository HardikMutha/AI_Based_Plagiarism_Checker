from app.extensions import mongo
from passlib.hash import pbkdf2_sha256

class Teacher:
    @staticmethod
    def create_teacher(username, password, email):
        hashed_password = pbkdf2_sha256.hash(password)
        teacher = {
            "username": username,
            "password": hashed_password,
            "email": email,
            "role": "teacher"
        }
        return mongo.db.teachers.insert_one(teacher)

    @staticmethod
    def find_by_username(username):
        return mongo.db.teachers.find_one({"username": username})

    @staticmethod
    def find_by_email(email):
        return mongo.db.teachers.find_one({"email": email})

    @staticmethod
    def verify_password(password, hashed_password):
        return pbkdf2_sha256.verify(password, hashed_password)
