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
