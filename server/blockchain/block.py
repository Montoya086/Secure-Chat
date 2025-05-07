import hashlib
import json
from datetime import datetime

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
