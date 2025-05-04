from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import base64

def generate_key_pair():
    # generate a private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    # generate a public key
    public_key = private_key.public_key()
    return private_key, public_key

def get_public_key_pem(public_key):
    # convert the public key to PEM format
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

def get_private_key_pem(private_key):
    # convert the private key to PEM format
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
