from flask import Blueprint, request, jsonify, current_app
import jwt
import json
from datetime import datetime, timedelta
from config.database import get_db
from middleware.jwt import token_required
from blockchain.chain import blockchain 
from aes_crypto.aesCrypto import encrypt_aes_gcm, decrypt_aes_gcm, generate_aes_key
from rsa_crypto.rsaCrypto import encrypt_with_public_key, decrypt_with_private_key
from hashing.signing import sign_message, verify_signature
import base64
from bson.objectid import ObjectId

chat_bp = Blueprint('chat', __name__)

# ===============================================
# 1. GET /users/{user}/key - Obtiene la llave pública del usuario
# ===============================================
@chat_bp.route('/users/<user_id>/key', methods=['GET'])
@token_required
def get_user_public_key(current_user, user_id):
    """
    Obtiene la llave pública del usuario especificado
    
    Args:
        user_id: ID del usuario cuya clave pública se solicita
    
    Returns:
        JSON con la clave pública del usuario
    """
    db = get_db()
    
    # Buscar usuario por ID
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    # Retornar claves públicas (RSA para cifrado, ECDSA para firma si existe)
    response = {
        'user_id': user_id,
        'email': user['email'],
        'name': f"{user['givenName']} {user['familyName']}",
        'public_key': user['public_key'],  # Clave RSA para cifrado
    }
    
    # Agregar clave de firma si existe
    if 'signing_public_key' in user:
        response['signing_public_key'] = user['signing_public_key']
    
    return jsonify(response), 200


# ===============================================
# 2. POST /messages/{user_destino} - Envía un mensaje cifrado y firmado
# ===============================================
@chat_bp.route('/messages/<user_destino>', methods=['POST'])
@token_required
def send_secure_message(current_user, user_destino):
    """
    Envía un mensaje CIFRADO y FIRMADO al mismo tiempo
    
    Flujo de seguridad:
    1. Firma el mensaje con clave privada del emisor (autenticidad)
    2. Cifra el mensaje con AES (confidencialidad)  
    3. Cifra la clave AES con clave pública del receptor (intercambio de claves)
    4. Almacena todo en la base de datos
    """
    db = get_db()
    data = request.get_json()
    
    mensaje_original = data.get('message')
    if not mensaje_original:
        return jsonify({'error': 'Campo "message" es requerido'}), 400
    
    # Obtener info del emisor
    emisor = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not emisor:
        return jsonify({'error': 'Usuario emisor no encontrado'}), 404
    
    # Obtener info del destinatario
    destinatario = db.users.find_one({'_id': ObjectId(user_destino)})
    if not destinatario:
        return jsonify({'error': 'Destinatario no encontrado'}), 404
    
    try:
        # === PASO 1: FIRMAR EL MENSAJE ===
        # Usar clave de firma si existe, sino usar clave RSA
        signing_key = emisor.get('signing_private_key', emisor['private_key'])
        firma_digital = sign_message(signing_key, mensaje_original)
        
        # Crear objeto del mensaje con firma
        mensaje_con_firma = {
            "mensaje": mensaje_original,
            "firma": firma_digital,
            "emisor_id": str(current_user['_id']),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Convertir a JSON para cifrar
        mensaje_json = json.dumps(mensaje_con_firma)
        
        # === PASO 2: CIFRAR EL MENSAJE ===
        # Generar clave AES única para este mensaje
        aes_key = generate_aes_key()
        
        # Cifrar el mensaje (que ya incluye la firma)
        nonce, ciphertext, tag = encrypt_aes_gcm(mensaje_json, aes_key)
        
        # === PASO 3: CIFRAR LA CLAVE AES ===
        # Cifrar la clave AES con la clave pública del destinatario
        encrypted_aes_key = encrypt_with_public_key(aes_key, destinatario['public_key'])
        
        # === PASO 4: ALMACENAR EN BASE DE DATOS ===
        mensaje_seguro = {
            'sender_id': ObjectId(current_user['_id']),
            'recipient_id': ObjectId(user_destino),
            'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
            'nonce': base64.b64encode(nonce).decode('utf-8'),
            'tag': base64.b64encode(tag).decode('utf-8'),
            'encrypted_key': base64.b64encode(encrypted_aes_key).decode('utf-8'),
            'timestamp': datetime.utcnow(),
            'is_signed': True,  # Indicador de que incluye firma
            'is_group': False
        }
        
        result = db.messages.insert_one(mensaje_seguro)
        
        # === PASO 5: REGISTRAR TRANSACCIÓN EN BLOCKCHAIN ===
        bloque_data = {
            "tipo": "mensaje_seguro",
            "mensaje_id": str(result.inserted_id),
            "contenido_cifrado": base64.b64encode(ciphertext).decode('utf-8'),
            "emisor": {
                "id": str(emisor['_id']),
                "nombre": f"{emisor['givenName']} {emisor['familyName']}",
                "email": emisor['email']
            },
            "receptor": {
                "id": str(destinatario['_id']),
                "nombre": f"{destinatario['givenName']} {destinatario['familyName']}",
                "email": destinatario['email']
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        blockchain.add_block(bloque_data)

        return jsonify({
            'status': 'Mensaje seguro enviado exitosamente',
            'message_id': str(result.inserted_id),
            'security_features': {
                'encrypted': True,
                'signed': True,
                'algorithm': 'AES-GCM + RSA-OAEP + ECDSA/RSA-PSS'
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Error al procesar mensaje seguro',
            'details': str(e)
        }), 500


# ===============================================
# 3. GET /messages/{user_origen}/{user_destino} - Obtiene mensajes firmados y cifrados
# ===============================================
@chat_bp.route('/messages/<user_origen>/<user_destino>', methods=['GET'])
@token_required
def get_conversation_messages(current_user, user_origen, user_destino):
    """
    Obtiene mensajes entre dos usuarios específicos
    Descifra y verifica las firmas digitales
    """
    db = get_db()
    
    # Verificar que el usuario actual es parte de la conversación
    current_user_id = str(current_user['_id'])
    if current_user_id not in [user_origen, user_destino]:
        return jsonify({'error': 'No tienes permisos para ver esta conversación'}), 403
    
    # Buscar mensajes entre los dos usuarios
    messages = db.messages.find({
        '$or': [
            {
                'sender_id': ObjectId(user_origen),
                'recipient_id': ObjectId(user_destino)
            },
            {
                'sender_id': ObjectId(user_destino),
                'recipient_id': ObjectId(user_origen)
            }
        ],
        'is_group': {'$ne': True}  # Excluir mensajes de grupo
    }).sort('timestamp', 1)  # Orden cronológico
    
    decrypted_messages = []
    
    for msg in messages:
        try:
            # === PASO 1: DESCIFRAR LA CLAVE AES ===
            encrypted_key = base64.b64decode(msg['encrypted_key'])
            aes_key = decrypt_with_private_key(encrypted_key, current_user['private_key'])
            
            # === PASO 2: DESCIFRAR EL MENSAJE ===
            nonce = base64.b64decode(msg['nonce'])
            ciphertext = base64.b64decode(msg['ciphertext'])
            tag = base64.b64decode(msg['tag'])
            
            mensaje_json_descifrado = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
            mensaje_con_firma = json.loads(mensaje_json_descifrado.decode('utf-8'))
            
            # === PASO 3: VERIFICAR FIRMA DIGITAL ===
            signature_valid = False
            if msg.get('is_signed', False):
                # Obtener clave pública del emisor
                emisor = db.users.find_one({'_id': msg['sender_id']})
                if emisor:
                    # Usar clave de verificación si existe, sino usar clave RSA
                    verification_key = emisor.get('signing_public_key', emisor['public_key'])
                    signature_valid = verify_signature(
                        verification_key,
                        mensaje_con_firma['mensaje'],
                        mensaje_con_firma['firma']
                    )
            
            # === PASO 4: PREPARAR RESPUESTA ===
            decrypted_messages.append({
                'id': str(msg['_id']),
                'sender_id': str(msg['sender_id']),
                'recipient_id': str(msg['recipient_id']),
                'content': mensaje_con_firma['mensaje'],
                'timestamp': msg['timestamp'],
                'security_info': {
                    'is_signed': msg.get('is_signed', False),
                    'signature_valid': signature_valid,
                    'encrypted': True
                }
            })
            
        except Exception as e:
            # Si hay error al descifrar, mostrar mensaje de error
            decrypted_messages.append({
                'id': str(msg['_id']),
                'error': 'No se pudo descifrar el mensaje',
                'details': str(e),
                'timestamp': msg['timestamp']
            })
    
    return jsonify({
        'conversation_between': {
            'user1': user_origen,
            'user2': user_destino
        },
        'message_count': len(decrypted_messages),
        'messages': decrypted_messages
    }), 200


# ===============================================
# 4. POST /transactions - Guarda transacciones en el blockchain
# ===============================================
@chat_bp.route('/transactions', methods=['POST'])
@token_required
def create_transaction(current_user):
    """
    Guarda una nueva transacción en el blockchain
    Para mensajes públicos, anuncios, etc.
    """
    db = get_db()
    data = request.get_json()
    
    transaction_data = data.get('data')
    transaction_type = data.get('type', 'custom')
    
    if not transaction_data:
        return jsonify({'error': 'Campo "data" es requerido'}), 400
    
    # Obtener info del usuario
    user = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    # Preparar datos para el blockchain
    bloque_data = {
        "tipo": transaction_type,
        "usuario": {
            "id": str(current_user['_id']),
            "nombre": f"{user['givenName']} {user['familyName']}",
            "email": user['email']
        },
        "fecha_creacion": datetime.utcnow().isoformat(),
        "data": transaction_data
    }
    
    # Agregar al blockchain
    blockchain.add_block(bloque_data)
    
    return jsonify({
        "mensaje": "Transacción registrada en el blockchain",
        "block_index": len(blockchain.chain) - 1,
        "transaction_type": transaction_type
    }), 201


# ===============================================
# 5. GET /transactions - Obtiene el historial del blockchain
# ===============================================
@chat_bp.route('/transactions', methods=['GET'])
@token_required
def get_blockchain_history(current_user):
    """
    Obtiene el historial completo del blockchain
    Útil para auditoría y transparencia
    """
    # Convertir blockchain a formato JSON serializable
    chain_data = []
    for block in blockchain.chain:
        block_info = {
            'index': block.index,
            'timestamp': block.timestamp,
            'data': block.data,
            'previous_hash': block.previous_hash,
            'hash': block.hash
        }
        chain_data.append(block_info)
    
    return jsonify({
        'blockchain_info': {
            'total_blocks': len(blockchain.chain),
            'is_valid': blockchain.is_chain_valid(),
            'latest_block_hash': blockchain.get_latest_block().hash
        },
        'blocks': chain_data
    }), 200