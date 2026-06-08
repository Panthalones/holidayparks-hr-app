from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from flask_session import Session

import msal
import os
import requests

import json
import threading
from datetime import datetime, timezone

try:
    import mysql.connector
except ImportError:
    mysql = None

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "HolidayParks-HR-Secret")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True

Session(app)

# Entra ID configuration
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL",
    "https://holidayparks-frontend.whitedune-b42d430c.swedencentral.azurecontainerapps.io"
)
BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    "https://holidayparks-backend.whitedune-b42d430c.swedencentral.azurecontainerapps.io"
)

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["User.Read"]

CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": FRONTEND_BASE_URL}}
)


def build_msal_app():
    return msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET
    )


def get_graph_access_token():
    token_result = build_msal_app().acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )

    if "access_token" not in token_result:
        return None, token_result

    return token_result["access_token"], None


def get_current_admin():
    print("SESSION USER =", session.get("user"))
    user = session.get("user")

    if not user:
        return "Onbekende admin"

    email = user.get("email")
    name = user.get("name")

    if email and name:
        return f"{name} ({email})"

    return email or name or "Onbekende admin"


class JsonAuditLogStore:
    """Audit log storage voor de schooldemo.

    Later kun je deze class vervangen door MySQLAuditLogStore zonder dat je frontend
    of routes hoeft aan te passen.
    """

    def __init__(self, file_path):
        self.file_path = file_path
        self.lock = threading.Lock()
        directory = os.path.dirname(self.file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        if not os.path.exists(self.file_path):
            self._write_logs([])

    def _read_logs(self):
        try:
            with open(self.file_path, "r", encoding="utf-8") as file:
                return json.load(file)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _write_logs(self, logs):
        with open(self.file_path, "w", encoding="utf-8") as file:
            json.dump(logs, file, indent=2, ensure_ascii=False)

    def list_logs(self, limit=100):
        with self.lock:
            logs = self._read_logs()
        return list(reversed(logs))[:limit]

    def add_log(self, action, description, performed_by, target_user_id=None):
        log_item = {
            "id": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
            "action": action,
            "description": description,
            "performed_by": performed_by,
            "target_user_id": target_user_id,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds")
        }

        with self.lock:
            logs = self._read_logs()
            logs.append(log_item)
            self._write_logs(logs)

        return log_item


class MySQLAuditLogStore:
    """Optionele MySQL-opslag. Zet AUDIT_STORAGE=mysql in .env om deze te gebruiken."""

    def __init__(self):
        if mysql is None:
            raise RuntimeError("mysql-connector-python is niet geïnstalleerd")
        self._create_table_if_needed()

    def _connection(self):
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )

    def _create_table_if_needed(self):
        with self._connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action VARCHAR(100) NOT NULL,
                    description TEXT NOT NULL,
                    performed_by VARCHAR(255) NOT NULL,
                    target_user_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.commit()

    def list_logs(self, limit=100):
        with self._connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, action, description, performed_by, target_user_id, created_at
                FROM audit_logs
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            logs = cursor.fetchall()

        for log in logs:
            if log.get("created_at"):
                log["created_at"] = log["created_at"].isoformat(sep=" ")
        return logs

    def add_log(self, action, description, performed_by, target_user_id=None):
        with self._connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                INSERT INTO audit_logs (action, description, performed_by, target_user_id)
                VALUES (%s, %s, %s, %s)
                """,
                (action, description, performed_by, target_user_id)
            )
            connection.commit()
            log_id = cursor.lastrowid

        return {
            "id": log_id,
            "action": action,
            "description": description,
            "performed_by": performed_by,
            "target_user_id": target_user_id,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds")
        }


def build_audit_store():
    storage_type = os.getenv("AUDIT_STORAGE", "json").lower()

    if storage_type == "mysql":
        return MySQLAuditLogStore()

    audit_log_file = os.getenv("AUDIT_LOG_FILE", "/tmp/fonteyn_audit_logs.json")
    return JsonAuditLogStore(audit_log_file)


audit_store = build_audit_store()


def write_audit_log(action, description, target_user_id=None):
    return audit_store.add_log(
        action=action,
        description=description,
        performed_by=get_current_admin(),
        target_user_id=target_user_id
    )


@app.route("/login")
def login():
    auth_url = build_msal_app().get_authorization_request_url(
        SCOPES,
        redirect_uri=f"{BACKEND_BASE_URL}/getAToken",
        prompt="select_account"
    )

    return redirect(auth_url)


@app.route("/getAToken")
def authorized():
    code = request.args.get("code")

    result = build_msal_app().acquire_token_by_authorization_code(
        code,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_BASE_URL}/getAToken"
    )

    if "id_token_claims" in result:
        session["user"] = {
            "name": result["id_token_claims"].get("name"),
            "email": result["id_token_claims"].get("preferred_username")
        }

        return redirect(FRONTEND_BASE_URL)

    return jsonify({
        "error": "Login failed",
        "details": result
    }), 401


@app.route("/api/user")
def current_user():
    if not session.get("user"):
        return jsonify({"authenticated": False})

    return jsonify({
        "authenticated": True,
        "user": session["user"]
    })


@app.route("/logout")
def logout():
    session.clear()

    return redirect(
        f"{AUTHORITY}/oauth2/v2.0/logout"
        f"?post_logout_redirect_uri={BACKEND_BASE_URL}/login"
    )


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "Fonteyn HR API",
        "auth": "Entra ID ready",
        "audit_storage": os.getenv("AUDIT_STORAGE", "json"),
        "audit_logs": "enabled"
    }), 200


@app.route("/api/entra-users", methods=["GET"])
def get_entra_users():
    try:
        access_token, error = get_graph_access_token()

        if error:
            return jsonify({
                "error": "Geen access token",
                "details": error
            }), 500

        users = []

        graph_url = (
            "https://graph.microsoft.com/v1.0/users"
            "?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,accountEnabled,onPremisesSyncEnabled"
            "&$top=999"
        )

        while graph_url:
            graph_response = requests.get(
                graph_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )

            data = graph_response.json()

            if graph_response.status_code != 200:
                return jsonify(data), graph_response.status_code

            users.extend(data.get("value", []))
            graph_url = data.get("@odata.nextLink")

        return jsonify(users), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entra-users", methods=["POST"])
def create_entra_user():
    try:

        if not session.get("user"):
            return jsonify({"error": "Niet ingelogd"}), 401

        if not session.get("user"):
            return jsonify({"error": "Niet ingelogd"}), 401

        data = request.get_json() or {}

        required_fields = ["name", "email", "function", "department", "location"]

        for field in required_fields:
            if field not in data or str(data[field]).strip() == "":
                return jsonify({"error": f"Missing field: {field}"}), 400

        access_token, error = get_graph_access_token()

        if error:
            return jsonify({
                "error": "Geen access token",
                "details": error
            }), 500

        temporary_password = "HolidayParks2026!"

        graph_user = {
            "accountEnabled": True,
            "displayName": data["name"].strip(),
            "mailNickname": data["email"].split("@")[0].strip(),
            "userPrincipalName": data["email"].strip(),
            "passwordProfile": {
                "forceChangePasswordNextSignIn": True,
                "password": temporary_password
            },
            "jobTitle": data["function"].strip(),
            "department": data["department"].strip(),
            "officeLocation": data["location"].strip()
        }

        graph_response = requests.post(
            "https://graph.microsoft.com/v1.0/users",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=graph_user
        )

        response_data = graph_response.json()

        if graph_response.status_code not in [200, 201]:
            return jsonify(response_data), graph_response.status_code

        created_user_id = response_data.get("id")
        write_audit_log(
            action="CREATE_USER",
            description=f"Nieuwe Entra ID gebruiker aangemaakt: {graph_user['displayName']} ({graph_user['userPrincipalName']})",
            target_user_id=created_user_id
        )

        return jsonify({
            "message": "Entra user created successfully",
            "temporaryPassword": temporary_password,
            "user": response_data
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entra-users/<user_id>/deactivate", methods=["PATCH"])
def deactivate_entra_user(user_id):
    try:

        if not session.get("user"):
            return jsonify({"error": "Niet ingelogd"}), 401

        access_token, error = get_graph_access_token()

        if error:
            return jsonify({
                "error": "Geen access token",
                "details": error
            }), 500

        graph_response = requests.patch(
            f"https://graph.microsoft.com/v1.0/users/{user_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={"accountEnabled": False}
        )

        if graph_response.status_code not in [200, 204]:
            return jsonify(graph_response.json()), graph_response.status_code

        write_audit_log(
            action="DEACTIVATE_USER",
            description=f"Entra ID gebruiker gedeactiveerd: {user_id}",
            target_user_id=user_id
        )

        return jsonify({
            "message": "Entra user deactivated successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/entra-users/<user_id>", methods=["DELETE"])
def delete_entra_user(user_id):
    try:

        if not session.get("user"):
            return jsonify({"error": "Niet ingelogd"}), 401

        access_token, error = get_graph_access_token()

        if error:
            return jsonify({
                "error": "Geen access token",
                "details": error
            }), 500

        graph_response = requests.delete(
            f"https://graph.microsoft.com/v1.0/users/{user_id}",
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )

        if graph_response.status_code not in [200, 204]:
            return jsonify(graph_response.json()), graph_response.status_code

        write_audit_log(
            action="DELETE_USER",
            description=f"Entra ID gebruiker permanent verwijderd: {user_id}",
            target_user_id=user_id
        )

        return jsonify({
            "message": "Entra user deleted successfully"
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@app.route("/api/entra-users/<user_id>", methods=["PATCH"])
def update_entra_user(user_id):
    try:

        if not session.get("user"):
            return jsonify({"error": "Niet ingelogd"}), 401

        data = request.get_json() or {}

        update_data = {}

        if data.get("displayName") and data.get("displayName").strip():
            update_data["displayName"] = data.get("displayName").strip()

        if data.get("jobTitle") and data.get("jobTitle").strip():
            update_data["jobTitle"] = data.get("jobTitle").strip()

        if data.get("department") and data.get("department").strip():
            update_data["department"] = data.get("department").strip()

        if data.get("officeLocation") and data.get("officeLocation").strip():
            update_data["officeLocation"] = data.get("officeLocation").strip()

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        access_token, error = get_graph_access_token()

        if error:
            return jsonify({
                "error": "Geen access token",
                "details": error
            }), 500

        graph_response = requests.patch(
            f"https://graph.microsoft.com/v1.0/users/{user_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=update_data
        )

        if graph_response.status_code not in [200, 204]:
            return jsonify(graph_response.json()), graph_response.status_code

        changed_fields = ", ".join(update_data.keys())
        write_audit_log(
            action="UPDATE_USER",
            description=f"Entra ID gebruiker bijgewerkt: {user_id}. Velden: {changed_fields}",
            target_user_id=user_id
        )

        return jsonify({
            "message": "Entra user updated successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    try:
        limit = request.args.get("limit", default=100, type=int)
        limit = max(1, min(limit, 500))
        return jsonify(audit_store.list_logs(limit=limit)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
