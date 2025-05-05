from dotenv import load_dotenv
import os
import requests
import json
from datetime import datetime, timedelta

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("DEVELOP_REDIRECT_URL")

# Google OAuth2 endpoints
TOKEN_URL = "https://oauth2.googleapis.com/token"
USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

def get_google_tokens(auth_code):
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": auth_code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(TOKEN_URL, data=data)
    token_data = response.json()
    
    if 'error' in token_data:
        raise Exception(f"Error getting tokens: {token_data['error']}")
    
    return token_data

def get_user_info(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(USER_INFO_URL, headers=headers)
    return response.json()