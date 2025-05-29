from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
import os

def generate_rsa_key_pair():
    """Genera un par de claves RSA"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    public_key = private_key.public_key()
    return private_key, public_key

def encrypt_with_public_key(plaintext, public_key_pem):
    """
    Cifra datos con una clave pública RSA
    
    Args:
        plaintext: Datos a cifrar (bytes)
        public_key_pem: Clave pública en formato PEM (str o bytes)
    
    Returns:
        bytes: Datos cifrados
    """
    if isinstance(public_key_pem, str):
        public_key_pem = public_key_pem.encode('utf-8')
    
    public_key = serialization.load_pem_public_key(
        public_key_pem,
    )
    
    ciphertext = public_key.encrypt(
        plaintext,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return ciphertext

def decrypt_with_private_key(ciphertext, private_key_pem):
    """
    Descifra datos con una clave privada RSA
    
    Args:
        ciphertext: Datos cifrados (bytes)
        private_key_pem: Clave privada en formato PEM (str o bytes)
    
    Returns:
        bytes: Datos descifrados
    """
    if isinstance(private_key_pem, str):
        private_key_pem = private_key_pem.encode('utf-8')
    
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None,
    )
    
    plaintext = private_key.decrypt(
        ciphertext,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return plaintext