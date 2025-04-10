from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import requests
from datetime import datetime, timedelta
from functools import wraps
from google.cloud import secretmanager
from google.cloud import firestore
from google.cloud import language_v1
import uuid
from flask_cors import CORS


def access_secret_version(project_id, secret_id, version_id="latest"):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")


PROJECT_ID = "enhanced-cable-456111-i8"

DB_HOST = access_secret_version(PROJECT_ID, "DB_HOST")
DB_NAME = access_secret_version(PROJECT_ID, "DB_NAME")
DB_USER = access_secret_version(PROJECT_ID, "DB_USER")
DB_PASSWORD = access_secret_version(PROJECT_ID, "DB_PASSWORD")
DB_PORT = access_secret_version(PROJECT_ID, "DB_PORT")
SECRET_KEY = access_secret_version(PROJECT_ID, "JWT_SECRET_KEY")
GEMINI_KEY = access_secret_version(PROJECT_ID, "GEMINI_KEY")
print("GEMINI_KEY:", GEMINI_KEY)

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = SECRET_KEY

db = SQLAlchemy(app)
firestore_client = firestore.Client(project=PROJECT_ID, database="mydatabase")


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)


class Mood(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    mood = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


with app.app_context():
    db.create_all()


def analyze_sentiment(text_content):
    client = language_v1.LanguageServiceClient()
    document = language_v1.Document(
        content=text_content,
        type_=language_v1.Document.Type.PLAIN_TEXT
    )
    response = client.analyze_sentiment(document=document)
    sentiment = response.document_sentiment
    return sentiment.score, sentiment.magnitude


def interpret_mood(score):
    if score >= 0.5:
        return "Very Happy"
    elif score > 0:
        return "Happy"
    elif score == 0:
        return "Neutral"
    elif score < 0 and score >= -0.5:
        return "Sad"
    else:
        return "Very Sad"


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            data = jwt.decode(
                token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                raise Exception("User not found")
        except Exception as e:
            return jsonify({'error': 'Token is invalid!', 'message': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User already exists'}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        token = jwt.encode(
            {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=1)},
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        return jsonify({'message': 'Login successful', 'token': token}), 200
    else:
        return jsonify({'error': 'Invalid email or password'}), 401


@app.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    user_list = [{'id': user.id, 'email': user.email,
                  'password': user.password} for user in users]
    return jsonify(user_list), 200


@app.route('/geminicall', methods=['POST'])
@token_required
def geminicall(current_user):
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    user_message = {
        'message_id': uuid.uuid4().hex,
        'userid': current_user.id,
        'content': prompt,
        'timestamp': datetime.utcnow(),
        'sent_by_gemini': False
    }
    try:
        firestore_client.collection('chat_history').add(user_message)
    except Exception as e:
        return jsonify({'error': 'Error saving user message', 'details': str(e)}), 500

    try:
        score, _ = analyze_sentiment(prompt)
        user_mood = interpret_mood(score)
        new_mood = Mood(user_id=current_user.id, mood=user_mood)
        db.session.add(new_mood)
        db.session.commit()
    except Exception as e:
        return jsonify({'error': 'Error processing mood', 'details': str(e)}), 500

    base_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='
    url = base_url + GEMINI_KEY

    headers = {'Content-Type': 'application/json'}
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status()
        response_data = response.json()
        response_text = response_data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        return jsonify({'error': 'Error calling Gemini API', 'details': str(e)}), 500

    gemini_message = {
        'message_id': uuid.uuid4().hex,
        'userid': current_user.id,
        'content': response_text,
        'timestamp': datetime.utcnow(),
        'sent_by_gemini': True
    }
    try:
        firestore_client.collection('chat_history').add(gemini_message)
    except Exception as e:
        return jsonify({'error': 'Error saving Gemini response', 'details': str(e)}), 500

    return jsonify({'response': response_text}), 200


@app.route('/messages', methods=['GET'])
@token_required
def get_messages(current_user):
    try:
        messages = []
        docs = firestore_client.collection('chat_history').where(
            'userid', '==', current_user.id).stream()
        for doc in docs:
            messages.append(doc.to_dict())
        return jsonify(messages), 200
    except Exception as e:
        return jsonify({'error': 'Error retrieving messages', 'details': str(e)}), 500


@app.route('/moods', methods=['GET'])
@token_required
def get_moods(current_user):
    try:
        moods = []
        docs = Mood.query.filter_by(user_id=current_user.id).all()
        for doc in docs:
            moods.append({'id': doc.id, 'mood': doc.mood,
                         'timestamp': doc.timestamp})
        return jsonify(moods), 200
    except Exception as e:
        return jsonify({'error': 'Error retrieving moods', 'details': str(e)}), 500


@app.route('/')
def index():
    return "Welcome to the Gemini Wrapper API!", 200


if __name__ == '__main__':
    app.run(debug=True)
