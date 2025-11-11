import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SQLALCHEMY_DATABASE_URI = os.getenv('TASK_DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG