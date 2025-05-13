'''
Descripción: Módulo que se encarga de firmar un mensaje y verificar su firma.
'''

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature, decode_dss_signature
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
import base64

'''
Firma un mensaje usando ECDSA y la clave privada en formato PEM
    
Args:
    private_key_pem (str): Clave privada en formato PEM
    message (str): Texto plano del mensaje

Returns:
    str: Firma codificada en base64
'''
def sign_message(private_key_pem: str, message: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    #Firmar mensaje con ECDSA y SHA-256
    signature = private_key.sign(
        message.encode('utf-8'),
        ec.ECDSA(hashes.SHA256())
    )
    return base64.b64encode(signature).decode('utf-8')

'''
Verifica una firma digital usando la clave pública del usuario

Args:
    public_key_pem (str): Clave pública en formato PEM
    message (str): El mensaje original
    signature_b64 (str): Firma codificada en b64

Returns:
    bool: true si la firma es válida, false si no
'''
def verify_signature(public_key_pem: str, message: str, signature_b64: str) -> bool:
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8')
    )
    signature = base64.b64decode(signature_b64)
    try:
        #Verifica la firma usando ECDSA y SHA-256
        public_key.verify(
            signature,
            message.encode('utf-8'),
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except InvalidSignature:
        return False
