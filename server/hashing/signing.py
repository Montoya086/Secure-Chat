'''
Módulo que se encarga de firmar un mensaje y verificar su firma.
Incluye funciones para generar claves ECDSA y manejar tanto RSA como ECDSA.
'''

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, rsa, padding
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature, decode_dss_signature
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
import base64

'''
Genera un par de claves ECDSA para firma digital

Returns:
    tuple: (private_key, public_key) objetos de cryptography
'''
def generate_ecdsa_key_pair():
    
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    return private_key, public_key

'''
Convierte clave privada ECDSA a formato PEM

Args:
    private_key: Objeto de clave privada ECDSA
    
Returns:
    bytes: Clave privada en formato PEM
'''
def get_ecdsa_private_key_pem(private_key):
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

'''
Convierte clave pública ECDSA a formato PEM

Args:
    public_key: Objeto de clave pública ECDSA
    
Returns:
    bytes: Clave pública en formato PEM
'''
def get_ecdsa_public_key_pem(public_key):
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

'''
Firma un mensaje usando ECDSA y la clave privada en formato PEM

Args:
    private_key_pem (str): Clave privada ECDSA en formato PEM
    message (str): Texto plano del mensaje

Returns:
    str: Firma codificada en base64
'''
def sign_message_ecdsa(private_key_pem: str, message: str) -> str:
    # Cargar clave privada ECDSA
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    # Verificar que es una clave ECDSA
    if not isinstance(private_key, ec.EllipticCurvePrivateKey):
        raise ValueError("La clave proporcionada no es una clave ECDSA")
    
    # Firmar mensaje con ECDSA y SHA-256
    signature = private_key.sign(
        message.encode('utf-8'),
        ec.ECDSA(hashes.SHA256())
    )
    return base64.b64encode(signature).decode('utf-8')

'''
Firma un mensaje usando RSA-PSS y la clave privada en formato PEM

Args:
    private_key_pem (str): Clave privada RSA en formato PEM
    message (str): Texto plano del mensaje

Returns:
    str: Firma codificada en base64
'''
def sign_message_rsa(private_key_pem: str, message: str) -> str:
    # Cargar clave privada RSA
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    # Verificar que es una clave RSA
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise ValueError("La clave proporcionada no es una clave RSA")
    
    # Firmar mensaje con RSA-PSS y SHA-256
    signature = private_key.sign(
        message.encode('utf-8'),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode('utf-8')

'''
Firma un mensaje detectando automáticamente el tipo de clave (RSA o ECDSA)

Args:
    private_key_pem (str): Clave privada en formato PEM
    message (str): Texto plano del mensaje

Returns:
    str: Firma codificada en base64
'''
def sign_message(private_key_pem: str, message: str) -> str:
    # Cargar la clave para detectar su tipo
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    if isinstance(private_key, ec.EllipticCurvePrivateKey):
        return sign_message_ecdsa(private_key_pem, message)
    elif isinstance(private_key, rsa.RSAPrivateKey):
        return sign_message_rsa(private_key_pem, message)
    else:
        raise ValueError("Tipo de clave no soportado para firma")

'''
Verifica una firma digital ECDSA usando la clave pública del usuario

Args:
    public_key_pem (str): Clave pública ECDSA en formato PEM
    message (str): El mensaje original
    signature_b64 (str): Firma codificada en b64

Returns:
    bool: True si la firma es válida, False si no
'''
def verify_signature_ecdsa(public_key_pem: str, message: str, signature_b64: str) -> bool:
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        
        # Verificar que es una clave ECDSA
        if not isinstance(public_key, ec.EllipticCurvePublicKey):
            return False
        
        signature = base64.b64decode(signature_b64)
        
        # Verifica la firma usando ECDSA y SHA-256
        public_key.verify(
            signature,
            message.encode('utf-8'),
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except (InvalidSignature, Exception):
        return False

'''
Verifica una firma digital RSA usando la clave pública del usuario

Args:
    public_key_pem (str): Clave pública RSA en formato PEM
    message (str): El mensaje original
    signature_b64 (str): Firma codificada en b64

Returns:
    bool: True si la firma es válida, False si no
'''
def verify_signature_rsa(public_key_pem: str, message: str, signature_b64: str) -> bool:
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        
        # Verificar que es una clave RSA
        if not isinstance(public_key, rsa.RSAPublicKey):
            return False
        
        signature = base64.b64decode(signature_b64)
        
        # Verifica la firma usando RSA-PSS y SHA-256
        public_key.verify(
            signature,
            message.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except (InvalidSignature, Exception):
        return False

'''
Verifica una firma digital detectando automáticamente el tipo de clave

Args:
    public_key_pem (str): Clave pública en formato PEM
    message (str): El mensaje original
    signature_b64 (str): Firma codificada en b64

Returns:
    bool: True si la firma es válida, False si no
'''
def verify_signature(public_key_pem: str, message: str, signature_b64: str) -> bool:
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            return verify_signature_ecdsa(public_key_pem, message, signature_b64)
        elif isinstance(public_key, rsa.RSAPublicKey):
            return verify_signature_rsa(public_key_pem, message, signature_b64)
        else:
            return False
    except Exception:
        return False

'''
Genera el hash de un mensaje usando el algoritmo especificado

Args:
    message (str): Mensaje a hashear
    algorithm (str): Algoritmo de hash ('sha256' o 'sha3_256')

Returns:
    str: Hash en formato hexadecimal
'''
def get_message_hash(message: str, algorithm: str = 'sha256') -> str:
    if algorithm.lower() == 'sha256':
        digest = hashes.Hash(hashes.SHA256())
    elif algorithm.lower() == 'sha3_256':
        digest = hashes.Hash(hashes.SHA3_256())
    else:
        raise ValueError("Algoritmo no soportado. Use 'sha256' o 'sha3_256'")
    
    digest.update(message.encode('utf-8'))
    return digest.finalize().hex()

'''
Extrae la clave pública de una clave privada

Args:
    private_key_pem (str): Clave privada en formato PEM

Returns:
    str: Clave pública en formato PEM
'''
def extract_public_key_from_private(private_key_pem: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    public_key = private_key.public_key()
    
    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return public_key_pem.decode('utf-8')