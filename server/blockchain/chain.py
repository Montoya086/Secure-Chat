from blockchain.block import Block
from config.database import get_db

class Blockchain:
    def __init__(self):
        self.chain = [self.create_genesis_block()]  # Inicia la cadena con el bloque génesis

    def load_chain_from_db(self):
        """
        Carga todos los bloques desde la base de datos MongoDB en orden.
        Si no hay bloques, crea el bloque génesis.
        """
        db = get_db()
        blocks_collection = db["blocks"]
        bloques = list(blocks_collection.find().sort("index", 1))  # Asegura orden

        if not bloques:
            genesis = self.create_genesis_block()
            genesis.save_to_db()
            return [genesis]
        else:
            return [Block(
                index=block["index"],
                data=block["data"],
                previous_hash=block["previous_hash"]
            ) for block in bloques]

    def create_genesis_block(self):
        """
        Crea el primer bloque de la cadena.
        Este bloque no tiene datos reales ni bloque anterior.
        """
        return Block(0, {"genesis": True}, "0")

    def get_latest_block(self):
        """
        Devuelve el último bloque en la cadena.
        """
        return self.chain[-1]

    def add_block(self, data):
        """
        Agrega un nuevo bloque con los datos proporcionados.
        Se encadena al bloque anterior con su hash.
        """
        prev_block = self.get_latest_block()
        new_block = Block(len(self.chain), data, prev_block.hash)
        self.chain.append(new_block)
        new_block.save_to_db()

    def is_chain_valid(self):
        """
        Verifica que toda la cadena sea válida:
        - Hash del bloque correcto.
        - Hash del bloque anterior coincide.
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            if current.hash != current.calculate_hash():
                return False  # El hash actual fue modificado

            if current.previous_hash != previous.hash:
                return False  # El enlace entre bloques fue alterado

        return True  # La cadena es válida
    def to_list(self):
        """
        Devuelve la blockchain completa como una lista de diccionarios (JSON serializable)
        """
        return [block.to_dict() for block in self.chain]
    

# ✅ Instancia global del blockchain
blockchain = Blockchain()