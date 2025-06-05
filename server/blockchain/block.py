import hashlib
import json
from datetime import datetime
from config.database import get_db

class Block:
    def __init__(self, index, data, previous_hash):
        self.index = index                          # Posición del bloque en la cadena
        self.timestamp = datetime.utcnow().isoformat()  # Fecha y hora de creación en formato ISO
        self.data = data                            # Diccionario con información del mensaje (nombre, fecha_envio, data_enviada)
        self.previous_hash = previous_hash          # Hash del bloque anterior (para encadenamiento)
        self.hash = self.calculate_hash()           # Hash calculado del bloque actual

    def calculate_hash(self):
        """
        Calcula el hash del bloque utilizando SHA-256.
        Incluye: índice, timestamp, data y previous_hash.
        """
        block_string = json.dumps({
            'index': self.index,
            'timestamp': self.timestamp,
            'data': self.data,
            'previous_hash': self.previous_hash
        }, sort_keys=True).encode()

        return hashlib.sha256(block_string).hexdigest()
    
    def to_dict(self):
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "hash": self.hash
        }
    
    def save_to_db(self):
            """
            Guarda el bloque en MongoDB.
            - El bloque completo va a la colección 'blocks'.
            - Los datos del mensaje (si no es génesis) van a 'message_chain'.
            """
            db = get_db()
            blocks_collection = db["blocks"]
            messages_collection = db["message_chain"]

            block_data = self.to_dict()
            blocks_collection.insert_one(block_data)

            # Guardar el mensaje si no es el bloque génesis
            if not block_data["data"].get("genesis"):
                try:
                    message_data = {
                        "block_index": block_data["index"],
                        "sender": block_data["data"].get("emisor").get("nombre"),
                        "timestamp": block_data["data"].get("timestamp"),
                        "message_encrypted": block_data["data"].get("contenido_cifrado"),
                        "hash": block_data["hash"],
                        "previous_hash": block_data["previous_hash"]
                    }

                    # Verificamos que todos los campos estén presentes
                    if None in message_data.values():
                        raise ValueError("Faltan campos en el mensaje seguro", block_data["data"])

                    messages_collection.insert_one(message_data)

                except Exception as e:
                    print(f"❌ Error al guardar mensaje seguro: {e}")
