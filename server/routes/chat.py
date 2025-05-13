from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from config.database import get_db
from utils.crypto import generate_key_pair, get_public_key_pem, get_private_key_pem
from middleware.jwt import token_required
from blockchain.chain import blockchain 

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