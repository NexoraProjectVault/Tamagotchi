from flask import Blueprint, request, jsonify
from models import db, Pet

pets_bp = Blueprint('pets', __name__, url_prefix='/api/v1')

@pets_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Pet Service is running', 'service': 'pet_service'}), 200