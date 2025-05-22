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
from hashing.encryption import cifrar_y_firmar_msj, verificar_y_descifrar_msj

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
Envía un mensaje cifrado con ECDH+AES y firmado con ECDSA
'''
@chat_bp.route('/messages/<user_destino>', methods=['POST'])
@token_required
def enviar_mensaje_cifrado_firmado(current_user, user_destino):
    db = get_db()
    data = request.get_json()
    mensaje = data.get('mensaje')

    if not mensaje:
        return jsonify({'error': 'Mensaje es requerido'}), 400

    #Obtener info del emisor
    emisor = db.users.find_one({'_id': ObjectId(current_user['_id'])})
    if not emisor:
        return jsonify({'error': 'Usuario emisor no encontrado'}), 404

    #Obtener info del receptor por email o nombre
    receptor = db.users.find_one({
        '$or': [
            {'email': user_destino},
            {'givenName': user_destino},
            {'$expr': {'$eq': [{'$concat': ['$givenName', ' ', '$familyName']}, user_destino]}}
        ]
    })
    
    if not receptor:
        return jsonify({'error': 'Usuario receptor no encontrado'}), 404

    try:
        #Cifrar y firmar mensaje
        datos_seguros = cifrar_y_firmar_msj(
            mensaje,
            emisor['private_key'],
            receptor['public_key']
        )

        #Preparar bloque para blockchain
        bloque_data = {
            "nombre": emisor["givenName"] + " " + emisor["familyName"],
            "fecha_envio": datetime.utcnow().isoformat(),
            "data_enviada": {
                "receptor_id": str(receptor['_id']),
                "receptor_email": receptor['email'],
                "datos_cifrados": datos_seguros['datos_cifrados'],
                "firma": datos_seguros['firma'],
                "destino": user_destino
            }
        }

        #Guardar en blockchain
        blockchain.add_block(bloque_data)

        return jsonify({
            "mensaje": "Mensaje cifrado, firmado y registrado en blockchain",
            "receptor": receptor['email'],
            "timestamp": bloque_data["fecha_envio"]
        }), 201

    except Exception as e:
        return jsonify({'error': f'Error al procesar mensaje: {str(e)}'}), 500
    

'''
Obtiene mensajes cifrados, los descifra y verifica firmas
'''
@chat_bp.route('/messages/<user_origen>/<user_destino>', methods=['GET'])
@token_required
def obtener_mensajes_cifrados(current_user, user_origen, user_destino):
    db = get_db()
    
    #Verificar acceso
    usuario_actual = current_user['email']
    if usuario_actual != user_origen and usuario_actual != user_destino:
        return jsonify({'error': 'No tienes acceso a estos mensajes'}), 403

    #Obtener datos del usuario actual para descifrar
    usuario_actual_db = db.users.find_one({'email': usuario_actual})
    if not usuario_actual_db:
        return jsonify({'error': 'Usuario actual no encontrado'}), 404

    mensajes_procesados = []

    try:
        for block in blockchain.chain:
            if hasattr(block, 'data') and isinstance(block.data, dict):
                data_enviada = block.data.get('data_enviada', {})
                if isinstance(data_enviada, dict):
                    destino = data_enviada.get('destino')
                    nombre_emisor = block.data.get('nombre', '')
                    
                    #Filtrar mensajes relevantes
                    if (destino == user_destino and user_origen.lower() in nombre_emisor.lower()) or \
                        (data_enviada.get('receptor_email') == usuario_actual):
                        
                        datos_cifrados = data_enviada.get('datos_cifrados')
                        firma = data_enviada.get('firma')
                        
                        if datos_cifrados and firma:
                            #Determinar emisor y receptor para descifrado
                            if usuario_actual == user_destino:
                                #Yo soy el receptor, necesito la clave pública del emisor
                                emisor_db = db.users.find_one({
                                    '$expr': {'$eq': [{'$concat': ['$givenName', ' ', '$familyName']}, nombre_emisor]}
                                })
                                if emisor_db:
                                    resultado = verificar_y_descifrar_msj(
                                        {'datos_cifrados': datos_cifrados, 'firma': firma},
                                        usuario_actual_db['private_key'],
                                        emisor_db['public_key']
                                    )
                                else:
                                    continue
                            else:
                                #Yo soy el emisor, necesito la clave pública del receptor
                                receptor_db = db.users.find_one({'email': user_destino})
                                if receptor_db:
                                    resultado = verificar_y_descifrar_msj(
                                        {'datos_cifrados': datos_cifrados, 'firma': firma},
                                        usuario_actual_db['private_key'],
                                        receptor_db['public_key']
                                    )
                                else:
                                    continue

                            mensajes_procesados.append({
                                'id': block.hash,
                                'emisor': nombre_emisor,
                                'destino': destino,
                                'mensaje': resultado.get('mensaje'),
                                'fecha_envio': block.data.get('fecha_envio'),
                                'firma_valida': resultado.get('firma_valida'),
                                'cifrado_valido': resultado.get('cifrado_valido'),
                                'error': resultado.get('error'),
                                'timestamp': block.timestamp
                            })

        #Ordenar por timestamp
        mensajes_procesados.sort(key=lambda x: x['timestamp'], reverse=True)

        return jsonify({
            'mensajes': mensajes_procesados,
            'total': len(mensajes_procesados),
            'usuario_actual': usuario_actual
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error al procesar mensajes: {str(e)}'}), 500