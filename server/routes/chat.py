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
from group_crypto.groupKeyManager import GroupKeyManager

chat_bp = Blueprint('chat', __name__)

# ===============================================
# 1. GET /users/{user}/key - Obtiene la llave pública del usuario
# ===============================================
@chat_bp.route('/users/<user_id>/key', methods=['GET'])
@token_required
def get_user_public_key(current_user, user_id):
    """Obtiene la llave pública del usuario especificado"""
    db = get_db()
    
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    response = {
        'user_id': user_id,
        'email': user['email'],
        'name': f"{user['givenName']} {user['familyName']}",
        'public_key': user['public_key'],
    }
    
    if 'signing_public_key' in user:
        response['signing_public_key'] = user['signing_public_key']
    
    return jsonify(response), 200


# ===============================================
# 2. POST /messages/{user_destino} - FLUJO CORRECTO: cifrar → firmar → guardar
# ===============================================
@chat_bp.route('/messages/<user_destino>', methods=['POST'])
@token_required
def send_secure_message(current_user, user_destino):
    """
    FLUJO CORRECTO:
    1. Cifra el mensaje con AES-256
    2. Firma el mensaje cifrado con SHA-256
    3. Cifra la clave AES con RSA para ambos usuarios
    4. Guarda todo en BD (solo datos cifrados + hash de firma)
    """
    db = get_db()
    data = request.get_json()
    
    mensaje_original = data.get('message')
    if not mensaje_original:
        return jsonify({'error': 'Campo "message" es requerido'}), 400
    
    # Obtener usuarios completos desde la base de datos
    emisor = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not emisor:
        return jsonify({'error': 'Usuario emisor no encontrado'}), 404
    
    destinatario = db.users.find_one({'_id': ObjectId(user_destino)})
    if not destinatario:
        return jsonify({'error': 'Destinatario no encontrado'}), 404
    
    print(f"📤 FLUJO CORRECTO - Enviando mensaje de {emisor['email']} a {destinatario['email']}")
    
    try:
        # === PASO 1: CIFRAR EL MENSAJE CON AES-256 ===
        print(f"🔐 PASO 1: Cifrando mensaje con AES-256-GCM")
        
        # Preparar mensaje con metadatos
        mensaje_con_metadata = {
            "mensaje": mensaje_original,
            "emisor_id": str(current_user['_id']),
            "timestamp": datetime.utcnow().isoformat()
        }
        mensaje_json = json.dumps(mensaje_con_metadata)
        
        # Generar clave AES única y cifrar
        aes_key = generate_aes_key()
        nonce, ciphertext, tag = encrypt_aes_gcm(mensaje_json, aes_key)
        
        print(f"✅ Mensaje cifrado - Tamaño: {len(ciphertext)} bytes")
        
        # === PASO 2: FIRMAR EL MENSAJE CIFRADO CON SHA-256 ===
        print(f"✍️ PASO 2: Firmando mensaje cifrado con SHA-256")
        
        # Crear el hash del mensaje cifrado para firmar
        mensaje_para_firmar = base64.b64encode(ciphertext).decode('utf-8')
        
        # Firmar usando la clave del emisor (detecta automáticamente RSA/ECDSA + SHA-256)
        signing_key = emisor.get('signing_private_key', emisor['private_key'])
        firma_digital = sign_message(signing_key, mensaje_para_firmar)
        
        print(f"✅ Firma digital generada - Algoritmo: SHA-256")
        
        # === PASO 3: CIFRAR CLAVE AES PARA AMBOS USUARIOS ===
        print(f"🔑 PASO 3: Cifrando clave AES con RSA para ambos usuarios")
        
        # Cifrar para emisor y destinatario
        encrypted_key_sender = encrypt_with_public_key(aes_key, emisor['public_key'])
        encrypted_key_recipient = encrypt_with_public_key(aes_key, destinatario['public_key'])
        
        print(f"✅ Claves AES cifradas para ambos usuarios")
        
        # === PASO 4: GUARDAR SOLO DATOS CIFRADOS EN BD ===
        print(f"💾 PASO 4: Guardando SOLO datos cifrados en base de datos")
        
        mensaje_seguro = {
            'sender_id': ObjectId(current_user['_id']),
            'recipient_id': ObjectId(user_destino),
            
            # DATOS CIFRADOS (lo único que se guarda en BD)
            'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
            'nonce': base64.b64encode(nonce).decode('utf-8'),
            'tag': base64.b64encode(tag).decode('utf-8'),
            
            # CLAVES CIFRADAS
            'encrypted_key_sender': base64.b64encode(encrypted_key_sender).decode('utf-8'),
            'encrypted_key_recipient': base64.b64encode(encrypted_key_recipient).decode('utf-8'),
            
            # FIRMA DIGITAL (hash del mensaje cifrado)
            'digital_signature': firma_digital,
            
            # METADATOS
            'timestamp': datetime.utcnow(),
            'is_signed': True,
            'is_group': False,
            'version': 'v2_correct_flow'  # Identificar nuevo sistema
        }
        
        result = db.messages.insert_one(mensaje_seguro)
        
        print(f"✅ GUARDADO COMPLETO:")
        print(f"  - Mensaje original: NUNCA se guarda en BD")
        print(f"  - Mensaje cifrado: {mensaje_seguro['ciphertext'][:50]}...")
        print(f"  - Firma digital: {firma_digital[:50]}...")
        print(f"  - ID en BD: {result.inserted_id}")
        
        # === PASO 5: BLOCKCHAIN ===
        bloque_data = {
            "tipo": "mensaje_seguro_v2",
            "mensaje_id": str(result.inserted_id),
            "contenido_cifrado": base64.b64encode(ciphertext).decode('utf-8'),
            "firma_digital": firma_digital,
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
            'status': 'Mensaje seguro enviado con flujo correcto',
            'message_id': str(result.inserted_id),
            'security_features': {
                'encrypted': True,
                'signed': True,
                'algorithm': 'AES-256-GCM + RSA-OAEP + SHA-256',
                'flow': 'cifrar → firmar → guardar',
                'stored_encrypted': True
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error en flujo seguro: {str(e)}")
        return jsonify({
            'error': 'Error al procesar mensaje seguro',
            'details': str(e)
        }), 500


# ===============================================
# 3. GET /messages/{user_origen}/{user_destino} - RECEPCIÓN CORRECTA
# ===============================================
@chat_bp.route('/messages/<user_origen>/<user_destino>', methods=['GET'])
@token_required
def get_conversation_messages(current_user, user_origen, user_destino):
    """
    FLUJO DE RECEPCIÓN CORRECTO:
    1. Descifra la clave AES
    2. Verifica la integridad (firma del mensaje cifrado)
    3. Si la firma es válida, descifra el mensaje
    4. Muestra mensaje descifrado + estado de firma en frontend
    """
    db = get_db()
    
    # Verificar permisos
    current_user_id = str(current_user['_id'])
    if current_user_id not in [user_origen, user_destino]:
        return jsonify({'error': 'No tienes permisos para ver esta conversación'}), 403
    
    # Obtener usuario actual completo
    user_from_db = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not user_from_db:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    print(f"🔍 RECEPCIÓN - Usuario: {user_from_db['email']} (ID: {current_user_id})")
    
    # Buscar mensajes
    messages = db.messages.find({
        '$or': [
            {'sender_id': ObjectId(user_origen), 'recipient_id': ObjectId(user_destino)},
            {'sender_id': ObjectId(user_destino), 'recipient_id': ObjectId(user_origen)}
        ],
        'is_group': {'$ne': True}
    }).sort('timestamp', 1)
    
    decrypted_messages = []
    
    for msg in messages:
        try:
            sender_id = str(msg['sender_id'])
            recipient_id = str(msg['recipient_id'])
            
            print(f"\n📨 Procesando mensaje ID: {msg['_id']}")
            print(f"   De: {sender_id} → Para: {recipient_id}")
            
            # === VERIFICAR SISTEMA (v2 = nuevo, v1 = antiguo) ===
            is_new_system = msg.get('version') == 'v2_correct_flow'
            
            if is_new_system:
                print(f"🆕 Sistema NUEVO (v2) - Flujo correcto")
                
                # === PASO 1: OBTENER CLAVE CIFRADA CORRECTA ===
                if current_user_id == sender_id:
                    encrypted_key = base64.b64decode(msg['encrypted_key_sender'])
                    print(f"🔓 Usando clave para EMISOR")
                elif current_user_id == recipient_id:
                    encrypted_key = base64.b64decode(msg['encrypted_key_recipient'])
                    print(f"🔓 Usando clave para DESTINATARIO")
                else:
                    continue
                
                # === PASO 2: DESCIFRAR CLAVE AES ===
                aes_key = decrypt_with_private_key(encrypted_key, user_from_db['private_key'])
                print(f"🔑 Clave AES descifrada")
                
                # === PASO 3: VERIFICAR INTEGRIDAD (FIRMA) ===
                ciphertext_b64 = msg['ciphertext']
                firma_digital = msg['digital_signature']
                
                # Obtener clave pública del emisor para verificar firma
                emisor = db.users.find_one({'_id': msg['sender_id']})
                verification_key = emisor.get('signing_public_key', emisor['public_key'])
                
                # Verificar firma del mensaje cifrado
                signature_valid = verify_signature(verification_key, ciphertext_b64, firma_digital)
                print(f"🔏 Verificación de integridad: {'VÁLIDA' if signature_valid else 'INVÁLIDA'}")
                
                # === PASO 4: SOLO SI LA FIRMA ES VÁLIDA, DESCIFRAR ===
                if signature_valid:
                    nonce = base64.b64decode(msg['nonce'])
                    ciphertext = base64.b64decode(msg['ciphertext'])
                    tag = base64.b64decode(msg['tag'])
                    
                    mensaje_json_descifrado = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                    mensaje_con_metadata = json.loads(mensaje_json_descifrado.decode('utf-8'))
                    
                    content = mensaje_con_metadata['mensaje']
                    print(f"✅ Mensaje descifrado: {content[:50]}...")
                else:
                    content = "[MENSAJE CORRUPTO - Firma inválida]"
                    print(f"❌ Mensaje rechazado por firma inválida")
                
                decrypted_messages.append({
                    'id': str(msg['_id']),
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    'content': content,
                    'timestamp': msg['timestamp'],
                    'security_info': {
                        'is_signed': True,
                        'signature_valid': signature_valid,
                        'encrypted': True,
                        'system': 'v2_correct_flow'
                    }
                })
                
            else:
                # === COMPATIBILIDAD CON SISTEMA ANTIGUO ===
                print(f"🔄 Sistema ANTIGUO (v1) - Compatibilidad")
                
                # Lógica anterior para mensajes antiguos
                if 'encrypted_key_sender' in msg and 'encrypted_key_recipient' in msg:
                    # Sistema de doble cifrado antiguo
                    if current_user_id == sender_id:
                        encrypted_key = base64.b64decode(msg['encrypted_key_sender'])
                    elif current_user_id == recipient_id:
                        encrypted_key = base64.b64decode(msg['encrypted_key_recipient'])
                    else:
                        continue
                        
                    aes_key = decrypt_with_private_key(encrypted_key, user_from_db['private_key'])
                    nonce = base64.b64decode(msg['nonce'])
                    ciphertext = base64.b64decode(msg['ciphertext'])
                    tag = base64.b64decode(msg['tag'])
                    
                    mensaje_json_descifrado = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                    mensaje_con_firma = json.loads(mensaje_json_descifrado.decode('utf-8'))
                    content = mensaje_con_firma['mensaje']
                    
                    # Verificar firma del mensaje original (sistema antiguo)
                    signature_valid = False
                    if msg.get('is_signed', False):
                        emisor = db.users.find_one({'_id': msg['sender_id']})
                        if emisor:
                            verification_key = emisor.get('signing_public_key', emisor['public_key'])
                            signature_valid = verify_signature(
                                verification_key,
                                mensaje_con_firma['mensaje'],
                                mensaje_con_firma['firma']
                            )
                    
                    decrypted_messages.append({
                        'id': str(msg['_id']),
                        'sender_id': sender_id,
                        'recipient_id': recipient_id,
                        'content': content,
                        'timestamp': msg['timestamp'],
                        'security_info': {
                            'is_signed': msg.get('is_signed', False),
                            'signature_valid': signature_valid,
                            'encrypted': True,
                            'system': 'v1_legacy'
                        }
                    })
                    
                else:
                    # Sistema muy antiguo - solo destinatario puede ver
                    if current_user_id == recipient_id and 'encrypted_key' in msg:
                        encrypted_key = base64.b64decode(msg['encrypted_key'])
                        aes_key = decrypt_with_private_key(encrypted_key, user_from_db['private_key'])
                        
                        nonce = base64.b64decode(msg['nonce'])
                        ciphertext = base64.b64decode(msg['ciphertext'])
                        tag = base64.b64decode(msg['tag'])
                        
                        mensaje_json_descifrado = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                        mensaje_con_firma = json.loads(mensaje_json_descifrado.decode('utf-8'))
                        content = mensaje_con_firma['mensaje']
                    else:
                        content = "[Mensaje del sistema antiguo - no visible para emisor]"
                    
                    decrypted_messages.append({
                        'id': str(msg['_id']),
                        'sender_id': sender_id,
                        'recipient_id': recipient_id,
                        'content': content,
                        'timestamp': msg['timestamp'],
                        'security_info': {
                            'is_signed': False,
                            'signature_valid': False,
                            'encrypted': True,
                            'system': 'v0_very_old'
                        }
                    })
                    
        except Exception as e:
            print(f"❌ Error procesando mensaje {msg['_id']}: {str(e)}")
            decrypted_messages.append({
                'id': str(msg['_id']),
                'sender_id': str(msg.get('sender_id', '')),
                'recipient_id': str(msg.get('recipient_id', '')),
                'content': 'Error al descifrar mensaje',
                'error': f'Error: {str(e)}',
                'timestamp': msg['timestamp'],
                'security_info': {'is_signed': False, 'signature_valid': False, 'encrypted': True}
            })
    
    print(f"\n📋 Total mensajes procesados: {len(decrypted_messages)}")
    print(f"🔒 Todos los mensajes originales permanecen cifrados en BD")
    
    return jsonify({
        'conversation_between': {'user1': user_origen, 'user2': user_destino},
        'message_count': len(decrypted_messages),
        'messages': decrypted_messages
    }), 200


# ===============================================
# 4. POST /transactions - Blockchain
# ===============================================
@chat_bp.route('/transactions', methods=['POST'])
@token_required
def create_transaction(current_user):
    """Guarda una nueva transacción en el blockchain"""
    db = get_db()
    data = request.get_json()
    
    transaction_data = data.get('data')
    transaction_type = data.get('type', 'custom')
    
    if not transaction_data:
        return jsonify({'error': 'Campo "data" es requerido'}), 400
    
    user = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
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
    
    blockchain.add_block(bloque_data)
    
    return jsonify({
        "mensaje": "Transacción registrada en el blockchain",
        "block_index": len(blockchain.chain) - 1,
        "transaction_type": transaction_type
    }), 201


# ===============================================
# 5. GET /transactions - Historial blockchain
# ===============================================
@chat_bp.route('/transactions', methods=['GET'])
@token_required
def get_blockchain_history(current_user):
    """Obtiene el historial completo del blockchain"""
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


# ===============================================
# 6. POST /groups - Crear grupo con flujo correcto
# ===============================================
@chat_bp.route('/groups', methods=['POST'])
@token_required
def create_group(current_user):
    """Crea un nuevo grupo seguro"""
    db = get_db()
    data = request.get_json()
    
    group_name = data.get('name')
    member_ids = data.get('member_ids', [])  # IDs de usuarios a agregar
    
    if not group_name:
        return jsonify({'error': 'El nombre del grupo es requerido'}), 400
    
    try:
        # Obtener usuario actual completo
        admin = db.users.find_one({'_id': ObjectId(current_user['_id'])})
        if not admin:
            return jsonify({'error': 'Usuario administrador no encontrado'}), 404
        
        # Generar un ID único para el grupo
        group_id = str(ObjectId())
        
        print(f"👥 Creando grupo '{group_name}' con admin: {admin['email']}")
        
        # Crear el grupo con el GroupKeyManager
        key_manager = GroupKeyManager(db)
        aes_key = key_manager.create_group(group_id, str(current_user['_id']), group_name)
        
        # Agregar clave cifrada para el admin
        encrypted_key_admin = encrypt_with_public_key(aes_key, admin['public_key'])
        db.group_keys.insert_one({
            'group_id': group_id,
            'user_id': str(current_user['_id']),
            'encrypted_key': base64.b64encode(encrypted_key_admin).decode('utf-8'),
            'key_version': 1,
            'added_at': datetime.utcnow()
        })
        
        # Agregar miembros adicionales si se especificaron
        added_members = []
        for member_id in member_ids:
            try:
                member = db.users.find_one({'_id': ObjectId(member_id)})
                if member:
                    key_manager.add_member_to_group(
                        group_id,
                        str(current_user['_id']),
                        member_id,
                        member['public_key']
                    )
                    added_members.append({
                        'id': member_id,
                        'name': f"{member['givenName']} {member['familyName']}",
                        'email': member['email']
                    })
                    print(f"✅ Miembro agregado: {member['email']}")
            except Exception as e:
                print(f"❌ Error agregando miembro {member_id}: {str(e)}")
        
        return jsonify({
            'status': 'Grupo creado exitosamente',
            'group_id': group_id,
            'group_name': group_name,
            'admin_id': str(current_user['_id']),
            'members_added': added_members,
            'total_members': len(added_members) + 1,  # +1 por el admin
            'security_info': {
                'encryption': 'AES-256-GCM',
                'key_management': 'RSA-OAEP para intercambio de claves'
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Error creando grupo: {str(e)}")
        return jsonify({
            'error': 'Error al crear el grupo',
            'details': str(e)
        }), 500

# ===============================================
# 7. GET /groups - Obtener grupos del usuario
# ===============================================
@chat_bp.route('/groups', methods=['GET'])
@token_required
def get_user_groups(current_user):
    """Obtiene todos los grupos donde el usuario es miembro"""
    db = get_db()
    
    try:
        current_user_id = str(current_user['_id'])
        
        # Buscar grupos donde el usuario es miembro
        groups = db.groups.find({'members': current_user_id})
        
        user_groups = []
        for group in groups:
            # Obtener información de miembros
            member_details = []
            for member_id in group.get('members', []):
                member = db.users.find_one({'_id': ObjectId(member_id)})
                if member:
                    member_details.append({
                        'id': member_id,
                        'name': f"{member['givenName']} {member['familyName']}",
                        'email': member['email']
                    })
            
            # Obtener último mensaje del grupo
            last_message = db.messages.find_one(
                {'group_id': group['_id'], 'is_group': True},
                sort=[('timestamp', -1)]
            )
            
            last_message_preview = 'Sin mensajes'
            last_message_time = None
            if last_message:
                # Intentar descifrar para preview
                try:
                    key_manager = GroupKeyManager(db)
                    aes_key = key_manager.get_group_key_for_user(
                        group['_id'],
                        current_user_id,
                        current_user['private_key']
                    )
                    
                    nonce = base64.b64decode(last_message['nonce'])
                    ciphertext = base64.b64decode(last_message['ciphertext'])
                    tag = base64.b64decode(last_message['tag'])
                    
                    mensaje_json = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                    mensaje_data = json.loads(mensaje_json.decode('utf-8'))
                    
                    # Preview corto
                    content = mensaje_data['mensaje']
                    last_message_preview = content[:50] + '...' if len(content) > 50 else content
                    last_message_time = last_message['timestamp']
                except:
                    last_message_preview = 'Mensaje cifrado'
            
            user_groups.append({
                'id': group['_id'],
                'name': group['name'],
                'admin_id': group['admin_id'],
                'is_admin': group['admin_id'] == current_user_id,
                'member_count': len(group.get('members', [])),
                'members': member_details,
                'last_message': last_message_preview,
                'last_message_time': last_message_time,
                'created_at': group.get('created_at')
            })
        
        return jsonify({
            'groups': user_groups,
            'total_groups': len(user_groups)
        }), 200
        
    except Exception as e:
        print(f"❌ Error obteniendo grupos: {str(e)}")
        return jsonify({
            'error': 'Error al obtener grupos',
            'details': str(e)
        }), 500

# ===============================================
# 8. POST /groups/<group_id>/messages - FLUJO CORRECTO para grupos
# ===============================================
@chat_bp.route('/groups/<group_id>/messages', methods=['POST'])
@token_required
def send_group_message(current_user, group_id):
    """
    Envía mensaje a grupo con FLUJO CORRECTO:
    1. Cifra el mensaje con AES del grupo
    2. Firma el mensaje cifrado con SHA-256
    3. Guarda en BD (solo datos cifrados + firma)
    """
    db = get_db()
    data = request.get_json()
    
    mensaje_original = data.get('message')
    if not mensaje_original:
        return jsonify({'error': 'El mensaje es requerido'}), 400
    
    try:
        # Obtener usuario completo
        user = db.users.find_one({'_id': ObjectId(current_user['_id'])})
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar que el usuario es miembro del grupo
        group = db.groups.find_one({'_id': group_id, 'members': str(current_user['_id'])})
        if not group:
            return jsonify({'error': 'No eres miembro de este grupo'}), 403
        
        print(f"👥 Enviando mensaje grupal de {user['email']} al grupo '{group['name']}'")
        
        # === PASO 1: CIFRAR EL MENSAJE CON CLAVE DEL GRUPO ===
        print(f"🔐 PASO 1: Cifrando mensaje con clave AES del grupo")
        
        # Obtener la clave AES del grupo
        key_manager = GroupKeyManager(db)
        aes_key = key_manager.get_group_key_for_user(
            group_id,
            str(current_user['_id']),
            user['private_key']
        )
        
        # Preparar mensaje con metadatos
        mensaje_con_metadata = {
            "mensaje": mensaje_original,
            "emisor_id": str(current_user['_id']),
            "emisor_nombre": f"{user['givenName']} {user['familyName']}",
            "group_id": group_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        mensaje_json = json.dumps(mensaje_con_metadata)
        
        # Cifrar con la clave del grupo
        nonce, ciphertext, tag = encrypt_aes_gcm(mensaje_json, aes_key)
        print(f"✅ Mensaje cifrado - Tamaño: {len(ciphertext)} bytes")
        
        # === PASO 2: FIRMAR EL MENSAJE CIFRADO ===
        print(f"✍️ PASO 2: Firmando mensaje cifrado con SHA-256")
        
        # Firmar el mensaje cifrado (no el original)
        mensaje_para_firmar = base64.b64encode(ciphertext).decode('utf-8')
        signing_key = user.get('signing_private_key', user['private_key'])
        firma_digital = sign_message(signing_key, mensaje_para_firmar)
        
        print(f"✅ Firma digital generada")
        
        # === PASO 3: ALMACENAR EN BD (SOLO DATOS CIFRADOS) ===
        print(f"💾 PASO 3: Guardando solo datos cifrados en BD")
        
        mensaje_seguro = {
            'sender_id': ObjectId(current_user['_id']),
            'group_id': group_id,
            
            # DATOS CIFRADOS
            'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
            'nonce': base64.b64encode(nonce).decode('utf-8'),
            'tag': base64.b64encode(tag).decode('utf-8'),
            
            # FIRMA DIGITAL
            'digital_signature': firma_digital,
            
            # METADATOS
            'key_version': group['key_version'],
            'timestamp': datetime.utcnow(),
            'is_signed': True,
            'is_group': True,
            'version': 'v2_group_correct_flow'
        }
        
        result = db.messages.insert_one(mensaje_seguro)
        
        print(f"✅ GUARDADO GRUPAL COMPLETO:")
        print(f"  - Mensaje original: NUNCA se guarda")
        print(f"  - Mensaje cifrado: {mensaje_seguro['ciphertext'][:50]}...")
        print(f"  - Firma digital: {firma_digital[:50]}...")
        print(f"  - ID: {result.inserted_id}")
        
        return jsonify({
            'status': 'Mensaje grupal enviado exitosamente',
            'message_id': str(result.inserted_id),
            'group_id': group_id,
            'group_name': group['name'],
            'security_features': {
                'encrypted': True,
                'signed': True,
                'algorithm': 'AES-256-GCM + SHA-256',
                'flow': 'cifrar → firmar → guardar',
                'key_version': group['key_version']
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error enviando mensaje grupal: {str(e)}")
        return jsonify({
            'error': 'Error al enviar mensaje grupal',
            'details': str(e)
        }), 500

# ===============================================
# 9. GET /groups/<group_id>/messages - Obtener mensajes del grupo
# ===============================================
@chat_bp.route('/groups/<group_id>/messages', methods=['GET'])
@token_required
def get_group_messages(current_user, group_id):
    """
    Obtiene mensajes de grupo con FLUJO CORRECTO:
    1. Verifica integridad (firma del mensaje cifrado)
    2. Si válido, descifra con clave del grupo
    3. Muestra mensaje + info del emisor
    """
    db = get_db()
    
    try:
        # Obtener usuario completo
        user = db.users.find_one({'_id': ObjectId(current_user['_id'])})
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar que el usuario es miembro del grupo
        group = db.groups.find_one({'_id': group_id, 'members': str(current_user['_id'])})
        if not group:
            return jsonify({'error': 'No eres miembro de este grupo'}), 403
        
        print(f"👥 Obteniendo mensajes del grupo '{group['name']}' para {user['email']}")
        
        # Obtener la clave AES del grupo
        key_manager = GroupKeyManager(db)
        aes_key = key_manager.get_group_key_for_user(
            group_id,
            str(current_user['_id']),
            user['private_key']
        )
        
        # Obtener mensajes del grupo
        messages = db.messages.find({
            'group_id': group_id,
            'is_group': True
        }).sort('timestamp', 1).limit(100)
        
        decrypted_messages = []
        
        for msg in messages:
            try:
                sender_id = str(msg['sender_id'])
                
                print(f"📨 Procesando mensaje grupal ID: {msg['_id']}")
                
                # === VERIFICAR SISTEMA (v2 = nuevo, v1 = antiguo) ===
                is_new_system = msg.get('version') == 'v2_group_correct_flow'
                
                if is_new_system:
                    print(f"🆕 Sistema NUEVO (v2) - Flujo correcto grupal")
                    
                    # === PASO 1: VERIFICAR INTEGRIDAD (FIRMA) ===
                    ciphertext_b64 = msg['ciphertext']
                    firma_digital = msg['digital_signature']
                    
                    # Obtener clave pública del emisor
                    emisor = db.users.find_one({'_id': msg['sender_id']})
                    if not emisor:
                        continue
                        
                    verification_key = emisor.get('signing_public_key', emisor['public_key'])
                    signature_valid = verify_signature(verification_key, ciphertext_b64, firma_digital)
                    
                    print(f"🔏 Verificación de integridad: {'VÁLIDA' if signature_valid else 'INVÁLIDA'}")
                    
                    # === PASO 2: SOLO SI FIRMA VÁLIDA, DESCIFRAR ===
                    if signature_valid:
                        nonce = base64.b64decode(msg['nonce'])
                        ciphertext = base64.b64decode(msg['ciphertext'])
                        tag = base64.b64decode(msg['tag'])
                        
                        mensaje_json = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                        mensaje_data = json.loads(mensaje_json.decode('utf-8'))
                        
                        content = mensaje_data['mensaje']
                        sender_name = mensaje_data.get('emisor_nombre', 'Usuario desconocido')
                        
                        print(f"✅ Mensaje grupal descifrado: {content[:50]}... de {sender_name}")
                    else:
                        content = "[MENSAJE CORRUPTO - Firma inválida]"
                        sender_name = "Desconocido"
                        print(f"❌ Mensaje grupal rechazado por firma inválida")
                    
                    decrypted_messages.append({
                        'id': str(msg['_id']),
                        'sender_id': sender_id,
                        'sender_name': sender_name,
                        'group_id': group_id,
                        'content': content,
                        'timestamp': msg['timestamp'],
                        'security_info': {
                            'is_signed': True,
                            'signature_valid': signature_valid,
                            'encrypted': True,
                            'system': 'v2_group_correct_flow'
                        }
                    })
                    
                else:
                    # === COMPATIBILIDAD CON SISTEMA ANTIGUO ===
                    print(f"🔄 Sistema ANTIGUO (v1) - Compatibilidad grupal")
                    
                    # Solo intentar si la versión de clave coincide
                    if msg.get('key_version', 1) == group['key_version']:
                        nonce = base64.b64decode(msg['nonce'])
                        ciphertext = base64.b64decode(msg['ciphertext'])
                        tag = base64.b64decode(msg['tag'])
                        
                        mensaje_json = decrypt_aes_gcm(ciphertext, aes_key, nonce, tag)
                        mensaje_con_firma = json.loads(mensaje_json.decode('utf-8'))
                        
                        content = mensaje_con_firma['mensaje']
                        
                        # Verificar firma del mensaje original (sistema antiguo)
                        signature_valid = False
                        if msg.get('is_signed', False):
                            emisor = db.users.find_one({'_id': msg['sender_id']})
                            if emisor:
                                verification_key = emisor.get('signing_public_key', emisor['public_key'])
                                signature_valid = verify_signature(
                                    verification_key,
                                    content,
                                    mensaje_con_firma['firma']
                                )
                        
                        # Obtener nombre del emisor
                        emisor = db.users.find_one({'_id': msg['sender_id']})
                        sender_name = f"{emisor['givenName']} {emisor['familyName']}" if emisor else "Usuario desconocido"
                        
                        decrypted_messages.append({
                            'id': str(msg['_id']),
                            'sender_id': sender_id,
                            'sender_name': sender_name,
                            'group_id': group_id,
                            'content': content,
                            'timestamp': msg['timestamp'],
                            'security_info': {
                                'is_signed': msg.get('is_signed', False),
                                'signature_valid': signature_valid,
                                'encrypted': True,
                                'system': 'v1_group_legacy'
                            }
                        })
                    else:
                        decrypted_messages.append({
                            'id': str(msg['_id']),
                            'sender_id': sender_id,
                            'sender_name': 'Sistema',
                            'group_id': group_id,
                            'content': 'Este mensaje usa una versión antigua de clave',
                            'timestamp': msg['timestamp'],
                            'security_info': {
                                'is_signed': False,
                                'signature_valid': False,
                                'encrypted': True,
                                'system': 'v0_old_key'
                            }
                        })
                        
            except Exception as e:
                print(f"❌ Error procesando mensaje grupal {msg['_id']}: {str(e)}")
                decrypted_messages.append({
                    'id': str(msg['_id']),
                    'sender_id': str(msg.get('sender_id', '')),
                    'sender_name': 'Error',
                    'group_id': group_id,
                    'content': 'Error al descifrar mensaje',
                    'error': f'Error: {str(e)}',
                    'timestamp': msg['timestamp'],
                    'security_info': {'is_signed': False, 'signature_valid': False, 'encrypted': True}
                })
        
        print(f"📋 Total mensajes grupales procesados: {len(decrypted_messages)}")
        
        return jsonify({
            'group_id': group_id,
            'group_name': group['name'],
            'message_count': len(decrypted_messages),
            'current_key_version': group['key_version'],
            'messages': decrypted_messages
        }), 200
        
    except Exception as e:
        print(f"❌ Error obteniendo mensajes grupales: {str(e)}")
        return jsonify({
            'error': 'Error al obtener mensajes del grupo',
            'details': str(e)
        }), 500
    

# ===============================================
# 10. POST /groups/<group_id>/members - Agregar miembro a grupo
# ===============================================
@chat_bp.route('/groups/<group_id>/members', methods=['POST'])
@token_required
def add_group_member(current_user, group_id):
    """Agrega un nuevo miembro al grupo"""
    db = get_db()
    data = request.get_json()
    
    new_member_id = data.get('user_id')
    if not new_member_id:
        return jsonify({'error': 'user_id es requerido'}), 400
    
    try:
        # Obtener usuario actual (admin)
        admin = db.users.find_one({'_id': ObjectId(current_user['_id'])})
        if not admin:
            return jsonify({'error': 'Usuario administrador no encontrado'}), 404
        
        # Obtener nuevo miembro
        new_member = db.users.find_one({'_id': ObjectId(new_member_id)})
        if not new_member:
            return jsonify({'error': 'Usuario a agregar no encontrado'}), 404
        
        print(f"👥 Agregando miembro {new_member['email']} al grupo {group_id}")
        
        # Usar GroupKeyManager para agregar el miembro
        key_manager = GroupKeyManager(db)
        success = key_manager.add_member_to_group(
            group_id,
            str(current_user['_id']),
            new_member_id,
            new_member['public_key']
        )
        
        if success:
            return jsonify({
                'status': 'Miembro añadido exitosamente',
                'group_id': group_id,
                'new_member_id': new_member_id,
                'new_member_name': f"{new_member['givenName']} {new_member['familyName']}",
                'new_member_email': new_member['email']
            }), 200
        else:
            return jsonify({'error': 'No se pudo agregar el miembro'}), 500
            
    except ValueError as e:
        print(f"❌ Error de validación: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"❌ Error agregando miembro al grupo: {str(e)}")
        return jsonify({
            'error': 'Error al agregar miembro al grupo',
            'details': str(e)
        }), 500

# ===============================================
# 11. POST /groups/<group_id>/key/rotate - Rotar clave del grupo
# ===============================================
@chat_bp.route('/groups/<group_id>/key/rotate', methods=['POST'])
@token_required
def rotate_group_key(current_user, group_id):
    """Rota la clave del grupo (solo administradores)"""
    db = get_db()
    
    try:
        print(f"🔄 Rotando clave del grupo {group_id}")
        
        # Usar GroupKeyManager para rotar la clave
        key_manager = GroupKeyManager(db)
        new_version = key_manager.rotate_group_key(group_id, str(current_user['_id']))
        
        return jsonify({
            'status': 'Clave del grupo rotada exitosamente',
            'group_id': group_id,
            'new_key_version': new_version
        }), 200
        
    except ValueError as e:
        print(f"❌ Error de validación: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"❌ Error rotando clave del grupo: {str(e)}")
        return jsonify({
            'error': 'Error al rotar clave del grupo',
            'details': str(e)
        }), 500

# ===============================================
# 12. DELETE /groups/<group_id>/members/<member_id> - Remover miembro
# ===============================================
@chat_bp.route('/groups/<group_id>/members/<member_id>', methods=['DELETE'])
@token_required
def remove_group_member(current_user, group_id, member_id):
    """Remueve un miembro del grupo (solo administradores)"""
    db = get_db()
    
    try:
        print(f"👥 Removiendo miembro {member_id} del grupo {group_id}")
        
        # Usar GroupKeyManager para remover el miembro
        key_manager = GroupKeyManager(db)
        success = key_manager.remove_member_from_group(
            group_id,
            str(current_user['_id']),
            member_id
        )
        
        if success:
            return jsonify({
                'status': 'Miembro removido exitosamente',
                'group_id': group_id,
                'removed_member_id': member_id
            }), 200
        else:
            return jsonify({'error': 'No se pudo remover el miembro'}), 500
            
    except ValueError as e:
        print(f"❌ Error de validación: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"❌ Error removiendo miembro del grupo: {str(e)}")
        return jsonify({
            'error': 'Error al remover miembro del grupo',
            'details': str(e)
        }), 500