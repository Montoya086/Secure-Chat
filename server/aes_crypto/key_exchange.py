from aes_crypto.aesCrypto import generate_aes_key, encrypt_aes_gcm, decrypt_aes_gcm
from rsa_crypto.rsaCrypto import encrypt_with_public_key, decrypt_with_private_key
import base64
from datetime import datetime


class GroupKeyManager:
    def __init__(self, db):
        self.db = db
    

    def create_group(self, group_id, admin_id, group_name):
        """Crea un nuevo grupo con una clave AES"""
        aes_key = generate_aes_key()
        
        # Almacenar el grupo y su clave
        self.db.groups.insert_one({
            '_id': group_id,
            'name': group_name,
            'admin_id': admin_id,
            'aes_key': aes_key.hex(),
            'created_at': datetime.utcnow(),
            'members': [admin_id],
            'key_version': 1  # Para rotación de claves
        })
        return aes_key

    def add_member_to_group(self, group_id, admin_id, new_member_id, new_member_public_key_pem):
        """Añade un miembro al grupo y comparte la clave con él"""
        # Verificar que el admin es realmente admin del grupo
        group = self.db.groups.find_one({'_id': group_id, 'admin_id': admin_id})
        if not group:
            raise ValueError("Grupo no encontrado o no tienes permisos")
        
        # Obtener la clave AES del grupo
        aes_key = bytes.fromhex(group['aes_key'])
        
        # Cifrar la clave AES con la clave pública del nuevo miembro
        encrypted_key = encrypt_with_public_key(aes_key, new_member_public_key_pem)
        
        # Almacenar la clave cifrada para el usuario
        self.db.group_keys.update_one(
            {'group_id': group_id, 'user_id': new_member_id},
            {'$set': {
                'encrypted_key': base64.b64encode(encrypted_key).decode('utf-8'),
                'key_version': group['key_version'],
                'added_at': datetime.utcnow()
            }},
            upsert=True
        )
        
        # Añadir el miembro a la lista del grupo
        self.db.groups.update_one(
            {'_id': group_id},
            {'$addToSet': {'members': new_member_id}}
        )

    
    def rotate_group_key(self, group_id, admin_id):
        """Rota la clave del grupo y la redistribuye a todos los miembros"""
        group = self.db.groups.find_one({'_id': group_id, 'admin_id': admin_id})
        if not group:
            raise ValueError("Grupo no encontrado o no tienes permisos")
        
        # Generar nueva clave
        new_aes_key = generate_aes_key()
        
        # Obtener todos los miembros del grupo
        members = group['members']
        
        # Actualizar la clave para cada miembro
        for member_id in members:
            member = self.db.users.find_one({'_id': ObjectId(member_id)})
            if member:
                encrypted_key = encrypt_with_public_key(new_aes_key, member['public_key'])
                self.db.group_keys.update_one(
                    {'group_id': group_id, 'user_id': member_id},
                    {'$set': {
                        'encrypted_key': base64.b64encode(encrypted_key).decode('utf-8'),
                        'key_version': group['key_version'] + 1,
                        'updated_at': datetime.utcnow()
                    }},
                    upsert=True
                )
        
        # Actualizar la clave principal del grupo
        self.db.groups.update_one(
            {'_id': group_id},
            {'$set': {
                'aes_key': new_aes_key.hex(),
                'key_version': group['key_version'] + 1,
                'key_rotated_at': datetime.utcnow()
            }}
        )
        
        return new_aes_key
    
    def get_group_key_for_user(self, group_id, user_id, user_private_key_pem):
        """Obtiene la clave AES del grupo descifrada para un usuario"""
        record = self.db.group_keys.find_one(
            {'group_id': group_id, 'user_id': user_id},
            sort=[('key_version', -1)]  # Obtener la versión más reciente
        )
        if not record:
            raise ValueError("Usuario no está en el grupo o clave no compartida")
        
        encrypted_key = base64.b64decode(record['encrypted_key'])
        return decrypt_with_private_key(encrypted_key, user_private_key_pem)
    
    def get_group_members(self, group_id):
        """Obtiene los miembros de un grupo"""
        group = self.db.groups.find_one({'_id': group_id})
        if not group:
            raise ValueError("Grupo no encontrado")
        return group.get('members', [])
