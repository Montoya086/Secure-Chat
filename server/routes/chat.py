from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from middleware.jwt import token_required
from blockchain.chain import blockchain 
from aes.aes import encrypt_aes_gcm, decrypt_aes_gcm, serialize_aes_components, deserialize_aes_components, generate_aes_key
from rsa.rsa import encrypt_with_public_key, decrypt_with_private_key
from aes.key_exchange import GroupKeyManager
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


# send messages to a specific user
@chat_bp.route('/messages/<recipient_id>', methods=['POST'])
@token_required
def send_private_message(current_user, recipient_id):
    db = get_db()
    data = request.get_json()
    
    # obtener clave pública del destinatario
    recipient = db.users.find_one({'_id': ObjectId(recipient_id)})
    if not recipient:
        return jsonify({'error': 'Recipient not found'}), 404
    
    # generar clave AES para este mensaje
    aes_key = generate_aes_key()
    
    # cifrar el mensaje con AES
    nonce, ciphertext, tag = encrypt_aes_gcm(data['message'], aes_key)
    
    # cifrar la clave AES con la clave pública del destinatario
    encrypted_key = encrypt_with_public_key(aes_key, recipient['public_key'])
    
    # almacenar el mensaje
    message = {
        'sender_id': current_user['_id'],
        'recipient_id': ObjectId(recipient_id),
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'nonce': base64.b64encode(nonce).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8'),
        'encrypted_key': base64.b64encode(encrypted_key).decode('utf-8'),
        'timestamp': datetime.utcnow(),
        'is_group': False
    }
    
    db.messages.insert_one(message)
    
    return jsonify({'status': 'Message sent'}), 200


# recebe messages for the current user
@chat_bp.route('/messages', methods=['GET'])
@token_required
def get_messages(current_user):
    db = get_db()
    
    # obtener mensajes para el usuario actual
    messages = db.messages.find({
        '$or': [
            {'recipient_id': current_user['_id']},
            {'sender_id': current_user['_id']}
        ]
    }).sort('timestamp', -1)
    
    decrypted_messages = []
    for msg in messages:
        # descifrar la clave AES con nuestra clave privada
        encrypted_key = base64.b64decode(msg['encrypted_key'])
        aes_key = decrypt_with_private_key(encrypted_key, current_user['private_key'])
        
        # descifrar el mensaje
        nonce, ciphertext, tag = (
            base64.b64decode(msg['nonce']),
            base64.b64decode(msg['ciphertext']),
            base64.b64decode(msg['tag'])
        )
        
        plaintext = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
        
        decrypted_messages.append({
            'id': str(msg['_id']),
            'sender_id': str(msg['sender_id']),
            'recipient_id': str(msg['recipient_id']),
            'content': plaintext.decode('utf-8'),
            'timestamp': msg['timestamp'],
            'is_group': msg.get('is_group', False)
        })
    
    return jsonify(decrypted_messages), 200

# send messages to a group
@chat_bp.route('/group/<group_id>/messages', methods=['POST'])
@token_required
def send_group_message(current_user, group_id):
    db = get_db()
    data = request.get_json()
    
    # obtener la clave AES del grupo
    key_manager = GroupKeyManager(db)
    try:
        aes_key = key_manager.get_group_key_for_user(
            group_id, 
            current_user['_id'], 
            current_user['private_key']
        )
    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    
    # cifrar el mensaje con la clave del grupo
    nonce, ciphertext, tag = encrypt_aes_gcm(data['message'], aes_key)
    
    # almacenar el mensaje
    message = {
        'sender_id': current_user['_id'],
        'group_id': ObjectId(group_id),
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'nonce': base64.b64encode(nonce).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8'),
        'timestamp': datetime.utcnow(),
        'is_group': True
    }
    
    db.messages.insert_one(message)
    
    return jsonify({'status': 'Group message sent'}), 200