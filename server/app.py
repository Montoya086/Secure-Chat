from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET')
    app.config['MONGODB_URI'] = os.getenv('MONGODB_URI')
    app.config['REFRESH_TOKEN_EXPIRATION_TIME'] = os.getenv('REFRESH_TOKEN_EXPIRATION_TIME')
    app.config['ACCESS_TOKEN_EXPIRATION_TIME'] = os.getenv('ACCESS_TOKEN_EXPIRATION_TIME')

    # Register blueprints
    from routes.ums import auth_bp
    from routes.chat import chat_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=int(os.getenv('PORT', 3000))) 