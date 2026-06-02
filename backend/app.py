from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from flask_session import Session

import mysql.connector
import msal
import os

from dotenv import load_dotenv


load_dotenv()

app = Flask(__name__)


app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "HolidayParks-HR-Secret"
)

app.config["SESSION_TYPE"] = "filesystem"

Session(app)

CORS(
    app,
    supports_credentials=True
)


# Entra ID configuration
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL",     "https://holidayparks-frontend.whitedune-b42d430c.swedencentral.azurecontainerapps.io")
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL",     "https://holidayparks-backend.whitedune-b42d430c.swedencentral.azurecontainerapps.io")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

SCOPES = [
    "User.Read"
]


# MySQL configuration
db_config = {
    "host": os.getenv("DB_HOST", "172.16.10.7"),
    "user": os.getenv("DB_USER", "hrapp"),
    "password": os.getenv("DB_PASSWORD", "Admin123!"),
    "database": os.getenv("DB_NAME", "fonteyn_hr")
}


def get_db_connection():
    return mysql.connector.connect(**db_config)

def build_msal_app():

    return msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET
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
            "email": result["id_token_claims"].get(
                "preferred_username"
            )
        }

    return redirect(f"{FRONTEND_BASE_URL}/accounting.html")
        

    return jsonify({
        "error": "Login failed",
        "details": result
    }), 401


@app.route("/api/user")
def current_user():

    if not session.get("user"):

        return jsonify({
            "authenticated": False
        })

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
        "database": "MySQL"
    }), 200

def get_performed_by():
    if session.get("user"):
        return session["user"].get("email", "Unknown user")

    return "HR Admin"


def create_audit_log(action, description):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO audit_logs
        (action, description, performed_by)
        VALUES (%s, %s, %s)
    """, (
        action,
        description,
        get_performed_by()
    ))

    conn.commit()
    cursor.close()
    conn.close()

@app.route("/api/employees", methods=["GET"])
def get_employees():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, function_name, department, location, status, created_at
            FROM employees
            ORDER BY id DESC
        """)

        employees = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(employees), 200

    except Exception as e:
        return jsonify({
            "error": "Database error",
            "details": str(e)
        }), 500
    
@app.route("/api/employees", methods=["POST"])
def add_employee():
    try:
        data = request.get_json()

        required_fields = ["name", "function", "department", "location"]

        for field in required_fields:
            if field not in data or data[field] == "":
                return jsonify({
                    "error": f"Missing field: {field}"
                }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO employees
            (name, function_name, department, location, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["name"],
            data["function"],
            data["department"],
            data["location"],
            "Actief"
        ))

        conn.commit()

        cursor.close()
        conn.close()

        create_audit_log(
            "Employee added",
            f"New employee '{data['name']}' was added to department '{data['department']}'."
        )

        return jsonify({
            "message": "Employee added successfully"
        }), 201

    except Exception as e:
        return jsonify({
            "error": "Database error",
            "details": str(e)
        }), 500
    
@app.route("/api/employees/<int:id>", methods=["PUT"])
def update_employee(id):
    try:
        data = request.get_json()

        required_fields = ["name", "function", "department", "location", "status"]

        for field in required_fields:
            if field not in data or data[field] == "":
                return jsonify({
                    "error": f"Missing field: {field}"
                }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE employees
            SET name = %s,
                function_name = %s,
                department = %s,
                location = %s,
                status = %s
            WHERE id = %s
        """, (
            data["name"],
            data["function"],
            data["department"],
            data["location"],
            data["status"],
            id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        create_audit_log(
            "Employee updated",
            f"Employee '{data['name']}' was updated."
        )

        return jsonify({
            "message": "Employee updated successfully"
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Database error",
            "details": str(e)
        }), 500
    
@app.route("/api/employees/<int:id>/deactivate", methods=["PUT"])
def deactivate_employee(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT name FROM employees WHERE id = %s",
            (id,)
        )

        employee = cursor.fetchone()

        if not employee:
            cursor.close()
            conn.close()
            return jsonify({
                "error": "Employee not found"
            }), 404

        cursor.execute("""
            UPDATE employees
            SET status = %s
            WHERE id = %s
        """, (
            "Inactief",
            id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        create_audit_log(
            "Employee deactivated",
            f"Employee '{employee['name']}' was deactivated."
        )

        return jsonify({
            "message": "Employee deactivated successfully"
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Database error",
            "details": str(e)
        }), 500
    
@app.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, action, description, performed_by, created_at
            FROM audit_logs
            ORDER BY id DESC
        """)

        logs = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(logs), 200

    except Exception as e:
        return jsonify({
            "error": "Database error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )