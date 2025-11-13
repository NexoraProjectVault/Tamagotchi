import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    USER_SERVICE_URL = os.getenv('USER_SERVICE_URL')
    PET_SERVICE_URL = os.getenv('PET_SERVICE_URL')
    TASK_SERVICE_URL = os.getenv('TASK_SERVICE_URL')
    DATA_TRACKING_SERVICE_URL = os.getenv('DATA_TRACKING_SERVICE_URL')