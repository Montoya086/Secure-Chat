from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os
import base64

def generate_aes_key():
    """Genera una clave AES-256 segura"""
    return os.urandom(32)

def encrypt_aes_gcm(plaintext, key):
    """
    Cifra un mensaje usando AES-GCM (Autenticado)
    
    Args:
        plaintext: Mensaje en texto plano (bytes)
        key: Clave AES (32 bytes)
    
    Returns:
        tuple: (nonce, ciphertext, tag) todos en bytes
    """
    if isinstance(plaintext, str):
        plaintext = plaintext.encode('utf-8')
    
    nonce = os.urandom(12)  # 96 bits para GCM
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(nonce),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    return (nonce, ciphertext, encryptor.tag)

def decrypt_aes_gcm(ciphertext, key, nonce, tag):
    """
    Descifra un mensaje usando AES-GCM
    
    Args:
        ciphertext: Mensaje cifrado (bytes)
        key: Clave AES (32 bytes)
        nonce: Valor nonce usado en el cifrado (bytes)
        tag: Tag de autenticación (bytes)
    
    Returns:
        bytes: Mensaje descifrado
    """
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(nonce, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()

def serialize_aes_components(nonce, ciphertext, tag):
    """Serializa los componentes AES para almacenamiento/transmisión"""
    return {
        'nonce': base64.b64encode(nonce).decode('utf-8'),
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8')
    }

def deserialize_aes_components(data):
    """Deserializa los componentes AES"""
    return (
        base64.b64decode(data['nonce']),
        base64.b64decode(data['ciphertext']),
        base64.b64decode(data['tag'])
    )