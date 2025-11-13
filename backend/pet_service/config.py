# backend/pet_service/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask / SQLAlchemy
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SQLALCHEMY_DATABASE_URI = os.getenv('PET_DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('DEBUG', 'False') == 'True'
    API_GATEWAY_URL = os.getenv('API_GATEWAY_URL')

    # XP / level rules
    PET_LEVEL_XP_BASE   = int(os.getenv('PET_LEVEL_XP_BASE', '100'))   # base XP for level 1->2
    PET_LEVEL_XP_GROWTH = float(os.getenv('PET_LEVEL_XP_GROWTH', '1.5'))  # per-level multiplier
    PET_MAX_LEVEL       = int(os.getenv('PET_MAX_LEVEL', '9'))  # max pet level

    # Stat clamps
    STAT_MIN = int(os.getenv('STAT_MIN', '0'))
    STAT_MAX = int(os.getenv('STAT_MAX', '100'))
    

    # Time-based decay (seconds per -1 point)
    HUNGER_DECAY_SEC     = float(os.getenv('HUNGER_DECAY_SEC', '600'))   # 1 every 10 min
    ENERGY_DECAY_SEC     = float(os.getenv('ENERGY_DECAY_SEC', '900'))   # 1 every 15 min
    HAPPINESS_DECAY_SEC  = float(os.getenv('HAPPINESS_DECAY_SEC', '1200')) # 1 every 20 min

    # Action point spend (used by routes)
    POINT_COST_PER_ACTION = int(os.getenv('POINT_COST_PER_ACTION', '1'))
    
    # XP added when actions succeed
    XP_PER_FEED  = int(os.getenv('XP_PER_FEED', '10'))
    XP_PER_PLAY  = int(os.getenv('XP_PER_PLAY', '15'))
    XP_PER_CLEAN = int(os.getenv('XP_PER_CLEAN', '8'))
