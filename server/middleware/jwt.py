from functools import wraps
from flask import request, jsonify, current_app
import jwt
from config.database import get_db
from bson import ObjectId

# middleware to verify the token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # get the token from the header
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        # if the token is not in the header, return an error
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # decode the token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            
            # Check if token is an access token
            if data.get('type') != 'access':
                return jsonify({'error': 'Invalid token type'}), 401
            
            db = get_db()
            current_user = db.users.find_one({'_id': ObjectId(data['user_id'])})
            
            # if the user is not found, return an error
            if not current_user:
                return jsonify({'error': 'User not found'}), 401

        except jwt.ExpiredSignatureError:
            # if the token has expired, return an error
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            # if the token is invalid, return an error
            return jsonify({'error': 'Invalid token'}), 401
        
        # return the user
        return f(current_user, *args, **kwargs)
    
    return decorated 