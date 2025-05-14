from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from utils.google import get_google_tokens
auth_bp = Blueprint('auth', __name__)

def generate_tokens(user_id, provider = 'local'):
    # Generate access token (15 minutes expiration)
    access_token = jwt.encode(
        {
            'sub': str(user_id),
            'exp': datetime.utcnow() + timedelta(minutes=int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME'])),
            'type': 'access',
            'provider': provider
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    # Generate refresh token (7 days expiration)
    refresh_token = jwt.encode(
        {
            'sub': str(user_id),
            'exp': datetime.utcnow() + timedelta(days=int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME'])),
            'type': 'refresh',
            'provider': provider
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return access_token, refresh_token

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    db = get_db()
    
    # Generate RSA key pair for the user
    private_key, public_key = generate_key_pair()
    private_key_pem = get_private_key_pem(private_key).decode('utf-8')
    public_key_pem = get_public_key_pem(public_key).decode('utf-8')

    # check if the user is already registered
    existing_user = db.users.find_one({'email': data['email']})
    if existing_user:
        # if the user exists but doesn't have a password, set it
        if 'password' not in existing_user:
            db.users.update_one({'email': data['email']}, {'$set': {'password': generate_password_hash(data['password'])}})
            # add the provider to the user
            db.users.update_one({'email': data['email']}, {'$push': {'providers': 'local'}})
            userId = existing_user['_id']
        else:
            return jsonify({'error': 'Email already exists'}), 400
    else:
        # if the user is not registered, create a new user
        user = {
            'email': data['email'],
            'givenName': data['givenName'],
            'familyName': data['familyName'],
            'providers': ['local'],
            'password': generate_password_hash(data['password']),
            'private_key': private_key_pem,
            'public_key': public_key_pem,
            'created_at': datetime.utcnow()
        }
    
        result = db.users.insert_one(user)
        userId = result.inserted_id
    
    access_token, refresh_token = generate_tokens(userId)
    
    return jsonify({
        'message': 'User registered successfully',
        'access_token': access_token,
        'access_token_expiration_time': int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME']) * 60 * 1000,
        'refresh_token': refresh_token,
        'refresh_token_expiration_time': int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME']) * 24 * 60 * 60 * 1000
    }), 201
    
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    db = get_db()
    
    user = db.users.find_one({'email': data['email']})
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token, refresh_token = generate_tokens(user['_id'])
    
    return jsonify({
        'access_token': access_token,
        'access_token_expiration_time': int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME']) * 60 * 1000,
        'refresh_token': refresh_token,
        'refresh_token_expiration_time': int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME']) * 24 * 60 * 60 * 1000
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    refresh_token = data['refresh_token']
    if not refresh_token:
        return jsonify({'error': 'Refresh token is required'}), 400
    
    try:
        # Verify refresh token
        payload = jwt.decode(
            refresh_token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        
        # Check if token is a refresh token
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
            
        # Generate new access token
        access_token = jwt.encode(
            {
                'sub': payload['sub'],
                'exp': datetime.utcnow() + timedelta(minutes=int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME'])),
                'type': 'access'
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'access_token': access_token,
            'access_token_expiration_time': int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME']) * 60 * 1000
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Refresh token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid refresh token'}), 401 
    



@auth_bp.route('/oauth/login', methods=['POST'])
def oauth_login():
    data = request.get_json()
    print(data)
    provider = data['provider']
    code = data['code']
    if provider == 'google':
        tokens = get_google_tokens(code)
        idToken = tokens['id_token']
        # decode idToken
        decoded_token = jwt.decode(idToken, options={"verify_signature": False})
        email = decoded_token.get('email', '')
        givenName = decoded_token.get('given_name', '')
        familyName = decoded_token.get('family_name', '')
        picture = decoded_token.get('picture', '')
        db = get_db()
        # check the email is already registered
        if not db.users.find_one({'email': email}):
            # register the user
            private_key, public_key = generate_key_pair()
            private_key_pem = get_private_key_pem(private_key).decode('utf-8')
            public_key_pem = get_public_key_pem(public_key).decode('utf-8')
            user = {
                'email': email,
                'providers': [provider],
                'private_key': private_key_pem,
                'public_key': public_key_pem,
                'created_at': datetime.utcnow(),
                'givenName': givenName,
                'familyName': familyName,
                'picture': picture
            }
            db.users.insert_one(user)

        # check if for provider is already registered
        if not db.users.find_one({'email': email, 'providers': {'$in': [provider]}}):
            db.users.update_one({'email': email}, {'$push': {'providers': provider}})
        userId = db.users.find_one({'email': email})['_id']
        refresh_token, access_token = generate_tokens(userId, 'google')
        return jsonify({
            'access_token': access_token,
            'access_token_expiration_time': int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME']) * 60 * 1000,
            'refresh_token': refresh_token,
            'refresh_token_expiration_time': int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME']) * 24 * 60 * 60 * 1000
        }), 200
    else:
        return jsonify({'error': 'Invalid provider'}), 400
