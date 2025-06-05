# Proyecto 2: Chat Seguro

## 📜 Descripción
Este proyecto busca diseñar e implementar un sistema de comunicaciones seguras que permita el registro y autenticación de usuarios mediante OAuth 2.0 y MFA, el intercambio de mensajes cifrados con AES y RSA/ECC, la firma digital con ECDSA, verificación de integridad con SHA-256/SHA-3, y almacenamiento inmutable de transacciones en un mini blockchain.

## ✨ Características
- Autenticación segura con OAuth 2.0, MFA (TOTP/WebAuthn), JWT y Refresh Tokens.
- Cifrado de mensajes individuales con AES-256 + RSA/ECC y grupales con AES-256-GCM.
- Intercambio de claves seguro mediante el protocolo X3DH (Signal Protocol).
- Firmas digitales de mensajes con ECDSA para garantizar autenticidad.
- Verificación de integridad usando algoritmos hash SHA-256 o SHA-3.
- Registro inmutable de mensajes en un mini blockchain con hash encadenado.

## 📦 Stack de Tecnologías
### Frontend
* [![Vite][Vite]][Vite-url]
### Backend
* [![Python][Python]][Python-url]
* [![Mongo][Mongo]][Mongo-url]
### Control de Versiones
* [![GitHub][GitHub]][GitHub-url]
* [![Markdown][Markdown]][Markdown-url]

## 👥 Developers y roles

### Andrés Montoya
<a href="https://github.com/FerEsq">
  <img width='175' src="https://avatars.githubusercontent.com/u/84055444?v=4" alt="Andrés Montoya" />
</a>

#### Requerimiento asignado
**1. Autenticación Segura**
- ⏳Implementación de OAuth 2.0 y MFA (TOTP/WebAuthn).
- ✅ Protección de sesiones con JWT y Refresh Tokens.

### Jennifer Toxcón
<a href="https://github.com/Wachuuu15">
  <img width='175' src="https://avatars.githubusercontent.com/u/88355602?v=4" alt="Jennifer Toxcon" />
</a>

#### Requerimiento asignado
**2. Cifrado de Mensajes**
- ⏳ Mensajes individuales: AES-256 + RSA/ECC.
- ⏳ Chats grupales: Clave simétrica AES-256-GCM compartida.
- ⏳ Intercambio de claves seguro con X3DH (Signal Protocol).

### Fernanda Esquivel
<a href="https://github.com/FerEsq">
  <img width='175' src="https://github.com/FerEsq/FerEsq/blob/main/assets/headset.png" alt="Fernanda Esquivel" />
</a>

#### Requerimiento asignado
**3. Firma Digital y Hashing**
- ⏳ Mensajes firmados con ECDSA (clave privada del usuario).
- ⏳ Verificación de integridad con SHA-256 o SHA-3.

### Fabián Juarez
<a href="https://github.com/FabianJuarez182">
  <img width='175' src="https://avatars.githubusercontent.com/u/83832041?v=4" alt="Fabian Juarez" />
</a>

#### Requerimiento asignado
**4. Mini Blockchain para Registro de Mensajes**

- ⏳ Hash encadenado para evitar manipulación.
- ⏳ Registros inmutables de transacciones.

## 📋 Documentación SecureChat
### Diseño de Arquitectura
#### Arquitectura General
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │◄──►│  Flask Backend  │◄──►│   MongoDB       │
│                 │    │                 │    │                 │
│ • RTK Query     │    │ • JWT Auth      │    │ • Users         │
│ • Optimistic UI │    │ • AES-256-GCM   │    │ • Messages      │
│ • TypeScript    │    │ • RSA-OAEP      │    │ • Groups        │
└─────────────────┘    │ • SHA-256       │    │ • Group Keys    │
                       │ • Blockchain    │    │ • Blockchain    │
                       └─────────────────┘    └─────────────────┘
```

#### Seguridad (Flujo de Mensaje)
```
Mensaje Original → AES-256-GCM → Firma SHA-256 → RSA para claves → MongoDB
     ↓                ↓              ↓              ↓                ↓
"Hola mundo"      [encrypted]   [digital_sign]  [key_exchange]    [storage]
```

#### Componentes clave
- Frontend: React + RTK Query + Actualización Optimista
- Backend: Flask + JWT + GroupKeyManager + Blockchain
- Crypto: AES-256-GCM (mensajes) + RSA-OAEP (claves) + SHA-256 (firmas)
- DB: MongoDB (usuarios, mensajes cifrados, grupos)

##### 1. Integración del Encriptado y Firmado
```python
❌ Problema: Flujo de seguridad incorrecto en envío de mensajes
# Flujo inicial erróneo:
mensaje → firmar → cifrar → guardar

✅ Solución: Implementar flujo correcto de seguridad
# Flujo corregido:
mensaje → cifrar(AES-256-GCM) → firmar(SHA-256) → guardar
```

##### 2. Registro de Mensajes en Blockchain
```python
❌ Problema: Mensajes no se registraban automáticamente en blockchain
# Sin registro de auditoría

✅ Solución: Auto-registro en blockchain post-envío
bloque_data = {
    "tipo": "mensaje_seguro_v2",
    "mensaje_id": str(result.inserted_id),
    "contenido_cifrado": base64.b64encode(ciphertext),
    "firma_digital": firma_digital,
    # ... metadata del mensaje
}
blockchain.add_block(bloque_data)
```

##### 3. Renderizado de Mensajes
```python
❌ Problema: Mensajes no aparecían hasta enviar otro mensaje
// Race condition entre RTK Query cache y estado local

✅ Solución: Actualización optimista
const optimisticMessage = {
    id: generateTempId(),
    content: newMessage,
    isOptimistic: true
};
// Mensaje aparece INMEDIATAMENTE
setOptimisticMessages(prev => [...prev, optimisticMessage]);
```

##### 4. Endpoint de Creación de Grupos
```python
❌ Problema: Crear grupo sin miembros iniciales
# Solo admin, miembros se agregaban después manualmente

✅ Solución: Soporte para miembros en creación
@chat_bp.route('/groups', methods=['POST'])
def create_group():
    member_ids = data.get('member_ids', [])  # ✅ Nuevo parámetro
    
    # Agregar miembros al crear el grupo
    for member_id in member_ids:
        key_manager.add_member_to_group(
            group_id, admin_id, member_id, member_public_key
        )
```

### Casos de Prueba Funcionales
#### 1. Autenticación
```
✓ Registro de usuario nuevo
✓ Login con credenciales válidas
✓ Token refresh automático
✓ Logout y limpieza de sesión
```

#### 2. Mensajería Directa
```
✓ Enviar mensaje entre Alice y Bob
✓ Mensaje aparece instantáneamente (optimistic)
✓ Mensaje se confirma con ✓ al completarse
✓ Cifrado AES-256-GCM + firma SHA-256
✓ Solo emisor y receptor pueden descifrar
```

#### 3. Grupos
```
✓ Crear grupo con múltiples miembros
✓ Enviar mensaje grupal
✓ Mostrar nombre del emisor en grupos
✓ Distribución de claves AES a todos los miembros
✓ Admin puede agregar/remover miembros
```

#### 4. Seguridad
```
✓ Mensajes almacenados cifrados en BD
✓ Firmas digitales válidas
✓ Claves RSA únicas por usuario
✓ Rotación de claves grupales
✓ Blockchain para auditoría
```


## 💻 Instrucciones de Ejecución
### Clonar el repositorio
En la carpeta de su preferencia, abrir una terminal y ejecutar el comando:
```bash
gh repo clone Montoya086/Secure-Chat
```

### Contenedor de Docker 
En la carpeta de raiz, abrir una terminal y ejecutar el comando:
```bash
cd server
```
Luego, ejecuta el comando para levantar el contenedor:
```bash
docker-compose up --build
```

### Backend
En la misma terminal de la carpeta `server`,  ejecutar el comando:
```bash
python app.py
```
Toma en cuenta que para poder ejecutar el comando deberás tener alguna versión de [Python][Python-url] instalada.

### Frontend
En la misma terminal de la carpeta `server`,  ejecutar los comandos:
```bash
cd ..
```
```bash
cd client
```
Luego, ejecuta el comando para instalar las dependencias necesarias:
```bash
npm install
```
Finalmente ejecuta el comando para iniciar el ambiente de desarrollo:
```bash
npm run dev
```

<!-- MARKDOWN LINKS & IMAGES -->
[Python]: https://img.shields.io/badge/Python-4B8BBE?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org
[Markdown]: https://img.shields.io/badge/Markdown-000000?style=for-the-badge&logo=markdown&logoColor=white
[Markdown-url]: https://www.markdownguide.org
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white
[Vite-url]: https://vite.dev
[Mongo]: https://img.shields.io/badge/-MongoDB-13aa52?style=for-the-badge&logo=mongodb&logoColor=white
[Mongo-url]: https://www.mongodb.com
[Linkedin-fer]: https://www.linkedin.com/in/feresq
[Linkedin-monti]: https://www.linkedin.com/in/andrés-montoya-8a0743287/
[Linkedin]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[Github-fer]: https://github.com/FerEsq
[Github-monti]: https://github.com/Montoya086
[GitHub]: https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white
[Github-url]: https://github.com
[Website]: https://img.shields.io/badge/Website-226946?style=for-the-badge&logo=opera&logoColor=white
[Website-fer]: https://fer-esq.web.app
[Mail]: https://img.shields.io/badge/Gmail-DC143C?style=for-the-badge&logo=gmail&logoColor=white
[Mail-fer]: mailto:feresq.gt@gmail.com
