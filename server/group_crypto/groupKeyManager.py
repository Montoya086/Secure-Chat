from datetime import datetime
from aes_crypto.aesCrypto import generate_aes_key, encrypt_aes_gcm, decrypt_aes_gcm
from rsa_crypto.rsaCrypto import encrypt_with_public_key, decrypt_with_private_key
import base64
from bson.objectid import ObjectId

class GroupKeyManager:
    """
    Gestor de claves para grupos - Maneja la generación, distribución y rotación
    de claves AES para comunicación grupal segura
    """
    
    def __init__(self, db):
        self.db = db
    
    def create_group(self, group_id, admin_id, group_name):
        """
        Crea un nuevo grupo con clave AES única
        
        Args:
            group_id (str): ID único del grupo
            admin_id (str): ID del usuario administrador
            group_name (str): Nombre del grupo
            
        Returns:
            bytes: Clave AES generada para el grupo
        """
        print(f"🔑 GroupKeyManager: Creando grupo {group_name}")
        
        # Generar clave AES única para el grupo
        aes_key = generate_aes_key()
        
        # Crear registro del grupo en la base de datos
        group_data = {
            '_id': group_id,
            'name': group_name,
            'admin_id': admin_id,
            'members': [admin_id],  # El admin es siempre miembro
            'key_version': 1,
            'created_at': datetime.utcnow(),
            'last_activity': datetime.utcnow()
        }
        
        # Insertar el grupo
        self.db.groups.insert_one(group_data)
        print(f"✅ Grupo creado en BD: {group_id}")
        
        return aes_key
    
    def add_member_to_group(self, group_id, admin_id, new_member_id, member_public_key):
        """
        Agrega un nuevo miembro al grupo y le proporciona acceso a la clave
        
        Args:
            group_id (str): ID del grupo
            admin_id (str): ID del administrador que agrega al miembro
            new_member_id (str): ID del nuevo miembro
            member_public_key (str): Clave pública del nuevo miembro
            
        Returns:
            bool: True si se agregó exitosamente
        """
        print(f"👥 GroupKeyManager: Agregando miembro {new_member_id} al grupo {group_id}")
        
        # Verificar que el grupo existe y que el usuario es admin
        group = self.db.groups.find_one({'_id': group_id, 'admin_id': admin_id})
        if not group:
            raise ValueError("Grupo no encontrado o no tienes permisos de administrador")
        
        # Verificar que el usuario no esté ya en el grupo
        if new_member_id in group['members']:
            raise ValueError("El usuario ya es miembro del grupo")
        
        # Obtener la clave AES actual del grupo
        # Para esto, necesitamos descifrarla usando la clave del admin
        admin = self.db.users.find_one({'_id': ObjectId(admin_id)})
        if not admin:
            raise ValueError("Administrador no encontrado")
        
        aes_key = self._get_group_aes_key(group_id, admin_id, admin['private_key'])
        
        # Cifrar la clave AES para el nuevo miembro
        encrypted_key_for_member = encrypt_with_public_key(aes_key, member_public_key)
        
        # Guardar la clave cifrada para el nuevo miembro
        self.db.group_keys.insert_one({
            'group_id': group_id,
            'user_id': new_member_id,
            'encrypted_key': base64.b64encode(encrypted_key_for_member).decode('utf-8'),
            'key_version': group['key_version'],
            'added_at': datetime.utcnow()
        })
        
        # Agregar el miembro a la lista del grupo
        self.db.groups.update_one(
            {'_id': group_id},
            {
                '$push': {'members': new_member_id},
                '$set': {'last_activity': datetime.utcnow()}
            }
        )
        
        print(f"✅ Miembro {new_member_id} agregado al grupo {group_id}")
        return True
    
    def get_group_key_for_user(self, group_id, user_id, user_private_key):
        """
        Obtiene la clave AES del grupo para un usuario específico
        
        Args:
            group_id (str): ID del grupo
            user_id (str): ID del usuario
            user_private_key (str): Clave privada del usuario
            
        Returns:
            bytes: Clave AES descifrada
        """
        print(f"🔓 GroupKeyManager: Obteniendo clave del grupo {group_id} para usuario {user_id}")
        
        # Verificar que el usuario es miembro del grupo
        group = self.db.groups.find_one({'_id': group_id, 'members': user_id})
        if not group:
            raise ValueError("No eres miembro de este grupo")
        
        return self._get_group_aes_key(group_id, user_id, user_private_key)
    
    def _get_group_aes_key(self, group_id, user_id, user_private_key):
        """
        Método interno para obtener la clave AES descifrada
        
        Args:
            group_id (str): ID del grupo
            user_id (str): ID del usuario
            user_private_key (str): Clave privada del usuario
            
        Returns:
            bytes: Clave AES descifrada
        """
        # Buscar la clave cifrada para este usuario y grupo
        group_key_record = self.db.group_keys.find_one({
            'group_id': group_id,
            'user_id': user_id
        })
        
        if not group_key_record:
            raise ValueError("No tienes acceso a la clave de este grupo")
        
        # Descifrar la clave AES
        encrypted_key = base64.b64decode(group_key_record['encrypted_key'])
        aes_key = decrypt_with_private_key(encrypted_key, user_private_key)
        
        return aes_key
    
    def rotate_group_key(self, group_id, admin_id):
        """
        Rota la clave del grupo (genera nueva clave AES y la distribuye a todos los miembros)
        
        Args:
            group_id (str): ID del grupo
            admin_id (str): ID del administrador
            
        Returns:
            int: Nueva versión de la clave
        """
        print(f"🔄 GroupKeyManager: Rotando clave del grupo {group_id}")
        
        # Verificar permisos de administrador
        group = self.db.groups.find_one({'_id': group_id, 'admin_id': admin_id})
        if not group:
            raise ValueError("Grupo no encontrado o no tienes permisos de administrador")
        
        # Generar nueva clave AES
        new_aes_key = generate_aes_key()
        new_version = group['key_version'] + 1
        
        # Obtener todos los miembros del grupo
        members = group['members']
        
        # Eliminar claves anteriores
        self.db.group_keys.delete_many({'group_id': group_id})
        
        # Distribuir nueva clave a todos los miembros
        for member_id in members:
            member = self.db.users.find_one({'_id': ObjectId(member_id)})
            if member:
                encrypted_key = encrypt_with_public_key(new_aes_key, member['public_key'])
                
                self.db.group_keys.insert_one({
                    'group_id': group_id,
                    'user_id': member_id,
                    'encrypted_key': base64.b64encode(encrypted_key).decode('utf-8'),
                    'key_version': new_version,
                    'added_at': datetime.utcnow()
                })
        
        # Actualizar versión en el grupo
        self.db.groups.update_one(
            {'_id': group_id},
            {
                '$set': {
                    'key_version': new_version,
                    'last_activity': datetime.utcnow()
                }
            }
        )
        
        print(f"✅ Clave rotada a versión {new_version} para grupo {group_id}")
        return new_version
    
    def remove_member_from_group(self, group_id, admin_id, member_id):
        """
        Remueve un miembro del grupo y rota la clave por seguridad
        
        Args:
            group_id (str): ID del grupo
            admin_id (str): ID del administrador
            member_id (str): ID del miembro a remover
            
        Returns:
            bool: True si se removió exitosamente
        """
        print(f"👥 GroupKeyManager: Removiendo miembro {member_id} del grupo {group_id}")
        
        # Verificar permisos
        group = self.db.groups.find_one({'_id': group_id, 'admin_id': admin_id})
        if not group:
            raise ValueError("Grupo no encontrado o no tienes permisos de administrador")
        
        if member_id not in group['members']:
            raise ValueError("El usuario no es miembro del grupo")
        
        if member_id == admin_id:
            raise ValueError("El administrador no puede removerse a sí mismo")
        
        # Remover miembro de la lista
        self.db.groups.update_one(
            {'_id': group_id},
            {
                '$pull': {'members': member_id},
                '$set': {'last_activity': datetime.utcnow()}
            }
        )
        
        # Eliminar su acceso a la clave
        self.db.group_keys.delete_many({
            'group_id': group_id,
            'user_id': member_id
        })
        
        # Rotar clave por seguridad
        self.rotate_group_key(group_id, admin_id)
        
        print(f"✅ Miembro {member_id} removido del grupo {group_id}")
        return True
    
    def get_group_info(self, group_id, user_id):
        """
        Obtiene información del grupo para un usuario
        
        Args:
            group_id (str): ID del grupo
            user_id (str): ID del usuario
            
        Returns:
            dict: Información del grupo
        """
        # Verificar que el usuario es miembro
        group = self.db.groups.find_one({'_id': group_id, 'members': user_id})
        if not group:
            return None
        
        return {
            'id': group['_id'],
            'name': group['name'],
            'admin_id': group['admin_id'],
            'members': group['members'],
            'member_count': len(group['members']),
            'key_version': group['key_version'],
            'created_at': group['created_at'],
            'last_activity': group['last_activity']
        }