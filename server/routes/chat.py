from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from middleware.jwt import token_required

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/chat', methods=['POST'])
@token_required # middleware to verify the token
def chat(current_user):
    pass # TODO: Implement chat

