from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from middleware.jwt import token_required
from blockchain.chain import blockchain 
from aes.aes import encrypt_aes_gcm, decrypt_aes_gcm
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
import os
import base64
from bson.objectid import ObjectId

#Imports para hashing
from config.database import get_db
from hashing.signing import sign_message
from bson.objectid import ObjectId

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    """
    Ruta para enviar un mensaje cifrado.
    Registra el mensaje en el blockchain como una transacción inmutable.
    """
    data = request.get_json()
    mensaje_cifrado_firmado = data.get('mensaje')

    # Datos de la transacción
    nombre = current_user['nombre']              # Extraído del JWT (usuario autenticado)
    fecha_envio = datetime.utcnow().isoformat()  # Fecha de envío en UTC
    data_enviada = mensaje_cifrado_firmado       # Contenido cifrado y firmado

    # Agrega el mensaje como un bloque
    blockchain.add_block({
        "nombre": nombre,
        "fecha_envio": fecha_envio,
        "data_enviada": data_enviada
    })

    return jsonify({"mensaje": "Mensaje registrado en el blockchain"}), 201


@chat_bp.route('/transactions', methods=['GET'])
@token_required
def obtener_transacciones(current_user):
    """
    Devuelve la lista de todos los bloques del blockchain.
    Útil para auditoría o historial de mensajes.
    """
    cadena = [block.__dict__ for block in blockchain.chain]
    return jsonify(cadena), 200

'''
Manda un mensaje firmado digitalmente (ECDSA) y lo registra en el blockchain

Args:
    current_user: Usuario autenticado vía token JWT
    user_destino: ID o nombre del usuario receptor (texto de la URL)

Body JSON:
    {
        "mensaje": "Hola Mundo!"
    }

Returns:
    JSON con confirmación de registro
'''
@chat_bp.route('/messages/<user_destino>', methods=['POST'])
@token_required
def enviar_mensaje_firmado(current_user, user_destino):
    db = get_db()
    data = request.get_json()
    mensaje = data.get('mensaje')

    if not mensaje:
        return jsonify({'error': 'Mensaje es requerido'}), 400

    #Obtener info del emisor desde la base de datos
    emisor = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not emisor:
        return jsonify({'error': 'Usuario emisor no encontrado'}), 404

    private_key_pem = emisor['private_key']

    #Firmar el mensaje con la clave privada
    firma = sign_message(private_key_pem, mensaje)

    #Preparar el bloque para el blockchain con la firma
    bloque_data = {
        "nombre": emisor["givenName"] + " " + emisor["familyName"],
        "fecha_envio": datetime.utcnow().isoformat(),
        "data_enviada": {
            "mensaje": mensaje,
            "firma": firma,
            "destino": user_destino
        }
    }

    #Guardar el mensaje como bloque en el blockchain
    blockchain.add_block(bloque_data)

    return jsonify({"mensaje": "Mensaje firmado y registrado en el blockchain"}), 201

@chat_bp.route('/send', methods=['POST'])
@token_required
def send_message(current_user):
    data = request.get_json()
    db = get_db()
    
    # obtener key publica del destinatario
    recipient = db.users.find_one({'_id': ObjectId(data['recipient_id'])})
    recipient_public_key = serialization.load_pem_public_key(recipient['public_key'].encode())
    
    # generar clave AES aleatoria para el mensaje
    aes_key = os.urandom(32)
    
    # cifrar mensaje con AES
    iv, ciphertext, tag = encrypt_aes_gcm(data['message'].encode(), aes_key)
    
    # cifrar clave AES con RSA del destinatario
    encrypted_aes_key = recipient_public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # save message to database
    db.messages.insert_one({
        'sender_id': current_user['_id'],
        'recipient_id': ObjectId(data['recipient_id']),
        'ciphertext': base64.b64encode(ciphertext).decode(),
        'iv': base64.b64encode(iv).decode(),
        'tag': base64.b64encode(tag).decode(),
        'encrypted_key': base64.b64encode(encrypted_aes_key).decode(),
        'timestamp': datetime.utcnow()
    })
    
    return jsonify({'status': 'Message sent'}), 200