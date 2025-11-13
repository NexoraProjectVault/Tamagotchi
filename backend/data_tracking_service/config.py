import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    API_GATEWAY_URL = os.getenv('API_GATEWAY_URL', 'http://api_gateway:5000')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATA_TRACKING_DATABASE_URL',
        'postgresql://postgres:postgres@data_tracking_db:5432/data_tracking_service'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('DEBUG', 'False') == 'True'