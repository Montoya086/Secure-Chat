from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from middleware.jwt import token_required
from blockchain.chain import blockchain 

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
    Devuelve toda la cadena de bloques (blockchain) con los mensajes registrados.
    """
    return jsonify(blockchain.to_list()), 200

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
