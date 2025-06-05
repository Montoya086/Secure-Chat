from aes_crypto.aesCrypto import generate_aes_key, encrypt_aes_gcm, decrypt_aes_gcm
from rsa_crypto.rsaCrypto import encrypt_with_public_key, decrypt_with_private_key
import base64

class GroupKeyManager:
    def __init__(self, db):
        self.db = db
    
    def create_group_key(self, group_id, admin_id):
        """Crea una nueva clave AES para un grupo"""
        aes_key = generate_aes_key()
        
        # Almacenar la clave en la base de datos
        self.db.groups.update_one(
            {'_id': group_id},
            {'$set': {'aes_key': aes_key.hex()}},
            upsert=True
        )
        return aes_key
    
    def add_member_to_group(self, group_id, user_id, user_public_key_pem):
        """Comparte la clave del grupo con un nuevo miembro"""
        group = self.db.groups.find_one({'_id': group_id})
        if not group:
            raise ValueError("Group not found")
        
        aes_key = bytes.fromhex(group['aes_key'])
        
        # Cifrar la clave AES con la clave pública del nuevo miembro
        encrypted_key = encrypt_with_public_key(aes_key, user_public_key_pem)
        
        # Almacenar la clave cifrada para el usuario
        self.db.group_keys.update_one(
            {'group_id': group_id, 'user_id': user_id},
            {'$set': {'encrypted_key': base64.b64encode(encrypted_key).decode('utf-8')}},
            upsert=True
        )
    
    def get_group_key_for_user(self, group_id, user_id, user_private_key_pem):
        """Obtiene la clave AES del grupo descifrada para un usuario"""
        record = self.db.group_keys.find_one({'group_id': group_id, 'user_id': user_id})
        if not record:
            raise ValueError("User not in group or key not shared")
        
        encrypted_key = base64.b64decode(record['encrypted_key'])
        return decrypt_with_private_key(encrypted_key, user_private_key_pem)