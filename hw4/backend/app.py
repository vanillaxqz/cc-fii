import os
import urllib
from uuid import uuid4
from datetime import datetime

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.data.tables import TableServiceClient

# === Globals ===

# SQLAlchemy ORM object (no app bound yet)
db = SQLAlchemy()

# Key Vault setup (managed identity)
KEY_VAULT_NAME = "smecherie"
KV_URI = f"https://{KEY_VAULT_NAME}.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=KV_URI, credential=credential)

# Azure Table Storage for Posts(AccountKey is static)
STORAGE_CONNECTION_STRING = os.getenv("STORAGE_CONNECTION_STRING", (
    "DefaultEndpointsProtocol=https;"
    "AccountName=smecherie;"
    "AccountKey=MISSING"
    "EndpointSuffix=core.windows.net"
))
table_service = TableServiceClient.from_connection_string(
    conn_str=STORAGE_CONNECTION_STRING)
posts_table = table_service.get_table_client(table_name="Posts")
try:
    posts_table.create_table()
except Exception:
    pass


# === SQLAlchemy models ===

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    cnp = db.Column(db.String(13), unique=True, nullable=False)
    location = db.Column(db.String(255))
    phone_number = db.Column(db.String(20))


# === Application factory ===

def create_app():
    app = Flask(__name__)
    CORS(app, origins=["*"], allow_headers=["Content-Type", "Authorization"])
    # --- Lazy-load DB password from Key Vault ---
    pwd = secret_client.get_secret("PWD").value
    odbc_str = (
        "Driver={ODBC Driver 18 for SQL Server};"
        "Server=tcp:smecherie.database.windows.net,1433;"
        "Database=smecherie;"
        "Uid=smecherie;"
        f"Pwd={pwd};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    params = urllib.parse.quote_plus(odbc_str)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"mssql+pyodbc:///?odbc_connect={params}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Bind SQLAlchemy to our app
    db.init_app(app)

    # === REST endpoints ===

    @app.route('/')
    def index():
        return jsonify({"message": "Welcome to the API!"}), 200

    @app.route("/register", methods=["POST"])
    def register():
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        cnp = data.get("CNP")
        location = data.get("location")
        phone_number = data.get("phone_number")

        if not (email and password and cnp):
            return jsonify({"error": "Email, password and CNP are required."}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered."}), 409

        user = User(
            email=email,
            password=password,
            cnp=cnp,
            location=location,
            phone_number=phone_number
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User registered successfully."}), 201

    @app.route("/login", methods=["POST"])
    def login():
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not (email and password):
            return jsonify({"error": "Email and password are required."}), 400
        user = User.query.filter_by(email=email).first()
        if not user or user.password != password:
            return jsonify({"error": "Invalid credentials."}), 401

        return jsonify({
            "message": "Login successful.",
            "user": {
                "email": user.email,
                "CNP": user.cnp,
                "location": user.location,
                "phone_number": user.phone_number
            }
        }), 200

    @app.route("/users", methods=["GET"])
    def list_users():
        users = User.query.all()
        return jsonify([
            {
                "email": u.email,
                "CNP": u.cnp,
                "location": u.location,
                "phone_number": u.phone_number
            }
            for u in users
        ]), 200

    @app.route("/posts", methods=["POST"])
    def create_post():
        data = request.get_json()
        user_id = data.get("user_id")
        content = data.get("content")
        if not (user_id and content):
            return jsonify({"error": "user_id and content are required."}), 400

        post_id = str(uuid4())
        now = datetime.utcnow().isoformat()
        entity = {
            "PartitionKey": user_id,
            "RowKey": post_id,
            "Content": content,
            "CreatedUtc": now
        }
        posts_table.create_entity(entity=entity)
        return jsonify({"post_id": post_id, "created": now}), 201

    @app.route("/posts", methods=["GET"])
    def list_posts():
        user_id = request.args.get("user_id")
        if user_id:
            pages = posts_table.query_entities(
                filter=f"PartitionKey eq '{user_id}'")
        else:
            pages = posts_table.list_entities()

        return jsonify([
            {
                "post_id": p["RowKey"],
                "user_id": p["PartitionKey"],
                "content": p.get("Content"),
                "created_utc": p.get("CreatedUtc")
            }
            for p in pages
        ]), 200

    return app


# === Entry point for local dev ===

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
