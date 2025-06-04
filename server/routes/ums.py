from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from utils.google import get_google_tokens
from middleware.jwt import token_required
import pyotp
import qrcode
import io
import base64
from hashing.signing import generate_ecdsa_key_pair, get_ecdsa_private_key_pem, get_ecdsa_public_key_pem

auth_bp = Blueprint('auth', __name__)

def generate_tokens(user_id, provider='local', mfa_enabled=False):
    """Genera tokens de acceso y refresh"""
    access_token = jwt.encode(
        {
            'sub': str(user_id),
            'exp': datetime.utcnow() + timedelta(minutes=int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME'])),
            'type': 'access',
            'provider': provider,
            'mfa_enabled': mfa_enabled
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    refresh_token = jwt.encode(
        {
            'sub': str(user_id),
            'exp': datetime.utcnow() + timedelta(days=int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME'])),
            'type': 'refresh',
            'provider': provider,
            'mfa_enabled': mfa_enabled
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return access_token, refresh_token

def create_user(db, email, givenName, familyName, password=None, providers=None, picture=None, key_type='both'):
    """
    Crea un nuevo usuario con claves criptográficas
    Por defecto genera ambas claves: RSA (cifrado) y ECDSA (firma)
    """
    user = {
        'email': email,
        'givenName': givenName,
        'familyName': familyName,
        'providers': providers or ['local'],
        'created_at': datetime.utcnow(),
        'mfa_secret': None,
        'mfa_enabled': False
    }
    
    # Generar claves RSA para cifrado/descifrado
    if key_type in ['rsa', 'both']:
        private_key, public_key = generate_key_pair()
        user.update({
            'private_key': get_private_key_pem(private_key).decode('utf-8'),
            'public_key': get_public_key_pem(public_key).decode('utf-8')
        })
    
    # Generar claves ECDSA para firma digital
    if key_type in ['ecdsa', 'both']:
        signing_private_key, signing_public_key = generate_ecdsa_key_pair()
        user.update({
            'signing_private_key': get_ecdsa_private_key_pem(signing_private_key).decode('utf-8'),
            'signing_public_key': get_ecdsa_public_key_pem(signing_public_key).decode('utf-8')
        })
    
    if password:
        user['password'] = generate_password_hash(password)
    if picture:
        user['picture'] = picture
    
    return db.users.insert_one(user)

def token_response(user_id, mfa_enabled, provider='local', status_code=200, message=None):
    """Genera respuesta con tokens"""
    access_token, refresh_token = generate_tokens(user_id, provider, mfa_enabled)
    response = jsonify({
        'access_token': access_token,
        'access_token_expiration_time': int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME']) * 60 * 1000,
        'refresh_token': refresh_token,
        'refresh_token_expiration_time': int(current_app.config['REFRESH_TOKEN_EXPIRATION_TIME']) * 24 * 60 * 60 * 1000
    })
    response.status_code = status_code
    if message:
        response.json['message'] = message
    return response

# ===============================================
# ENDPOINTS DE AUTENTICACIÓN ESENCIALES
# ===============================================

@auth_bp.route('/register', methods=['POST'])
def register():
    """Registra un nuevo usuario con claves RSA y ECDSA"""
    data = request.get_json()
    db = get_db()
    
    existing_user = db.users.find_one({'email': data['email']})
    mfa_enabled = False

    if existing_user:
        if 'password' not in existing_user:
            # Usuario existe pero sin password (registro OAuth previo)
            db.users.update_one({'email': data['email']}, {
                '$set': {'password': generate_password_hash(data['password'])},
                '$push': {'providers': 'local'}
            })
            userId = existing_user['_id']
            mfa_enabled = existing_user['mfa_enabled']
        else:
            return jsonify({'error': 'Email already exists'}), 400
    else:
        # Crear nuevo usuario con ambos tipos de claves
        result = create_user(
            db,
            email=data['email'],
            givenName=data['givenName'],
            familyName=data['familyName'],
            password=data['password'],
            key_type='both'  # RSA + ECDSA
        )
        userId = result.inserted_id

    return token_response(userId, mfa_enabled, status_code=201, message='User registered successfully')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Autentica un usuario"""
    data = request.get_json()
    db = get_db()
    
    user = db.users.find_one({'email': data['email']})
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return token_response(user['_id'], user['mfa_enabled'])

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Renueva el token de acceso"""
    data = request.get_json()
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'Refresh token is required'}), 400
    
    try:
        payload = jwt.decode(
            refresh_token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
        
        access_token = jwt.encode(
            {
                'sub': payload['sub'],
                'exp': datetime.utcnow() + timedelta(minutes=int(current_app.config['ACCESS_TOKEN_EXPIRATION_TIME'])),
                'type': 'access',
                'provider': payload['provider'],
                'mfa_enabled': payload['mfa_enabled']
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

@auth_bp.route('/users', methods=['GET'])
@token_required
def get_users(current_user):
    """Obtiene lista de usuarios registrados"""
    db = get_db()
    users = db.users.find({}, {
        'email': 1, 
        'givenName': 1, 
        'familyName': 1, 
        'created_at': 1
    })
    
    users_list = []
    for user in users:
        users_list.append({
            'id': str(user['_id']),
            'email': user['email'],
            'name': f"{user['givenName']} {user['familyName']}",
            'created_at': user.get('created_at', '')
        })
    
    return jsonify(users_list), 200

# ===============================================
# ENDPOINTS DE MFA (OPCIONAL - MANTENER PARA SEGURIDAD ADICIONAL)
# ===============================================

@auth_bp.route('/mfa/configure', methods=['POST'])
@token_required
def configure_mfa(current_user):
    """Configura autenticación de dos factores"""
    username = current_user['email']
    has_mfa = current_user['mfa_enabled']
    mfa_secret = current_user['mfa_secret']
    
    if has_mfa and mfa_secret:
        return jsonify({'qrcode': None, 'message': 'MFA already configured'})

    mfa_secret = pyotp.random_base32()
    db = get_db()
    db.users.update_one({'email': username}, {'$set': {'mfa_secret': mfa_secret}})
    
    provisioning_url = pyotp.totp.TOTP(mfa_secret).provisioning_uri(
        name=username,
        issuer_name="SecureChat"
    )

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(provisioning_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({"qrcode": img_str})

@auth_bp.route('/mfa/verify', methods=['POST'])
@token_required
def verify_mfa(current_user):
    """Verifica código MFA"""
    data = request.get_json()
    otp = data.get('otp')
    mfa_secret = current_user['mfa_secret']
    
    if not mfa_secret:
        return jsonify({'error': 'MFA secret not found'}), 400
    
    totp = pyotp.TOTP(mfa_secret)
    is_valid = totp.verify(otp)
    
    if is_valid:
        db = get_db()
        db.users.update_one({'email': current_user['email']}, {'$set': {'mfa_enabled': True}})
        return jsonify({'valid': True}), 200
    else:
        return jsonify({'error': 'Invalid OTP'}), 400