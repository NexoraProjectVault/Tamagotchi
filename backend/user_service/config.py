import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SQLALCHEMY_DATABASE_URI = os.getenv('USER_DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('DEBUG', 'False') == 'True'
    
    # >>> For configuring jwt user login <<<
    JWT_SECRET = os.getenv('JWT_SECRET')
    JWT_ISS = os.getenv('JWT_ISS')
    JWT_AUD = os.getenv('JWT_AUD')
    JWT_ACCESS_TTL_MIN = int(os.getenv('JWT_ACCESS_TTL_MIN'))