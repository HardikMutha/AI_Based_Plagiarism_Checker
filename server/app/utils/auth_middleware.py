from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def token_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        verify_jwt_in_request()
        return fn(*args, **kwargs)
    return decorator

def teacher_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") == "teacher":
            return fn(*args, **kwargs)
        else:
            return jsonify(msg="Teachers only!"), 403
    return decorator
