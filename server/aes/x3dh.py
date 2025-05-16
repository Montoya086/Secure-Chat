from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
import os

def x3dh_key_exchange(sender_private_key, recipient_public_key, ephemeral_private_key=None):
    # Generar clave efímera si no se proporciona
    if not ephemeral_private_key:
        ephemeral_private_key = ec.generate_private_key(ec.SECP256R1())
    
    # Derivar clave compartida
    shared_key1 = sender_private_key.exchange(ec.ECDH(), recipient_public_key)
    shared_key2 = ephemeral_private_key.exchange(ec.ECDH(), recipient_public_key)
    
    # Combinar claves con HKDF
    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'x3dh_key_derivation',
    ).derive(shared_key1 + shared_key2)
    
    return derived_key, ephemeral_private_key.public_key()