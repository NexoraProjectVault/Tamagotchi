import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user_service:5001')
    PET_SERVICE_URL = os.getenv('PET_SERVICE_URL', 'http://pet_service:5002')
    TASK_SERVICE_URL = os.getenv('TASK_SERVICE_URL', 'http://task_service:5003')