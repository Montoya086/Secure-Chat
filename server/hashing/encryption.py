'''
Módulo de cifrado híbrido usando ECDSA + AES
Descripción: Implementa intercambio de llaves ECDH y cifrado simétrico AES
'''

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import os
import base64

'''
Genera una clave compartida usando ECDH
    
Args:
    private_key_pem (str): Clave privada del emisor en formato PEM
    public_key_pem (str): Clave pública del receptor en formato PEM
    
Returns:
    bytes: Clave AES de 256 bits derivada usando HKDF
'''
def generar_key_compartida(private_key_pem: str, public_key_pem: str) -> bytes:
    #Cargar llaves
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8')
    )
    
    #Realizar intercambio ECDH
    shared_key = private_key.exchange(ec.ECDH(), public_key)
    
    #Derivar clave AES usando HKDF
    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,  #256 bits para AES-256
        salt=None,
        info=b'SecureChat-AES-Key'
    ).derive(shared_key)
    
    return derived_key

'''
Cifra un mensaje usando AES-256-GCM

Args:
    mensaje (str): Mensaje en texto plano
    clave_aes (bytes): Clave AES de 256 bits
    
Returns:
    dict: Contiene mensaje cifrado, IV y tag de autenticación
'''
def cifrar_msj(mensaje: str, clave_aes: bytes) -> dict:
    #Generar IV aleatorio
    iv = os.urandom(12)  #96 bits para GCM
    
    #Crear cifrador AES-GCM
    cipher = Cipher(algorithms.AES(clave_aes), modes.GCM(iv))
    encryptor = cipher.encryptor()
    
    #Cifrar mensaje
    mensaje_bytes = mensaje.encode('utf-8')
    mensaje_cifrado = encryptor.update(mensaje_bytes) + encryptor.finalize()
    
    return {
        'mensaje_cifrado': base64.b64encode(mensaje_cifrado).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8'),
        'tag': base64.b64encode(encryptor.tag).decode('utf-8')
    }

'''
Descifra un mensaje usando AES-256-GCM

Args:
    datos_cifrados (dict): Contiene mensaje cifrado, IV y tag
    clave_aes (bytes): Clave AES de 256 bits
    
Returns:
    str: Mensaje descifrado en texto plano
    
Raises:
    Exception: Si la autenticación falla o hay error en descifrado
'''
def descifrar_msj(datos_cifrados: dict, clave_aes: bytes) -> str:
    try:
        #Decodificar datos
        mensaje_cifrado = base64.b64decode(datos_cifrados['mensaje_cifrado'])
        iv = base64.b64decode(datos_cifrados['iv'])
        tag = base64.b64decode(datos_cifrados['tag'])
        
        #Crear descifrador AES-GCM
        cipher = Cipher(algorithms.AES(clave_aes), modes.GCM(iv, tag))
        decryptor = cipher.decryptor()
        
        #Descifrar mensaje
        mensaje_bytes = decryptor.update(mensaje_cifrado) + decryptor.finalize()
        
        return mensaje_bytes.decode('utf-8')
        
    except Exception as e:
        raise Exception(f"Error al descifrar mensaje: {str(e)}")

'''
Cifra un mensaje y lo firma digitalmente

Args:
    mensaje (str): Mensaje en texto plano
    private_key_emisor (str): Clave privada del emisor (para firmar)
    public_key_receptor (str): Clave pública del receptor (para cifrar)
    
Returns:
    dict: Mensaje cifrado y firmado
'''
def cifrar_y_firmar_msj(mensaje: str, private_key_emisor: str, public_key_receptor: str) -> dict:
    from hashing.signing import sign_message
    
    #Generar clave compartida usando ECDH
    clave_aes = generar_key_compartida(private_key_emisor, public_key_receptor)
    
    #Cifrar mensaje con AES
    datos_cifrados = cifrar_msj(mensaje, clave_aes)
    
    #Firmar el mensaje original con ECDSA
    firma = sign_message(private_key_emisor, mensaje)
    
    return {
        'datos_cifrados': datos_cifrados,
        'firma': firma,
        'mensaje_original_hash': base64.b64encode(
            hashes.Hash(hashes.SHA256()).finalize()
        ).decode('utf-8')
    }

'''
Verifica la firma y descifra un mensaje

Args:
    datos_completos (dict): Datos cifrados y firmados
    private_key_receptor (str): Clave privada del receptor (para descifrar)
    public_key_emisor (str): Clave pública del emisor (para verificar firma)
    
Returns:
    dict: Resultado con mensaje descifrado y estado de verificación
'''
def verificar_y_descifrar_msj(datos_completos: dict, private_key_receptor: str, public_key_emisor: str) -> dict:
    from hashing.signing import verify_signature
    
    try:
        #Generar la misma clave compartida
        clave_aes = generar_key_compartida(private_key_receptor, public_key_emisor)
        
        #Descifrar mensaje
        mensaje_descifrado = descifrar_msj(datos_completos['datos_cifrados'], clave_aes)
        
        #Verificar firma digital
        firma_valida = verify_signature(
            public_key_emisor, 
            mensaje_descifrado, 
            datos_completos['firma']
        )
        
        return {
            'mensaje': mensaje_descifrado,
            'firma_valida': firma_valida,
            'cifrado_valido': True,
            'error': None
        }
        
    except Exception as e:
        return {
            'mensaje': None,
            'firma_valida': False,
            'cifrado_valido': False,
            'error': str(e)
        }