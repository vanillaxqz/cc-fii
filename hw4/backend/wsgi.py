# wsgi.py
from app import create_app

# Gunicorn expects the variable to be "application"
application = create_app()
