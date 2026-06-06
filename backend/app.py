from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from flask_session import Session

import msal
import os
import requests

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
        "database": "disabled"
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

        return jsonify({
            "message": "Entra user deactivated successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entra-users/<user_id>", methods=["PATCH"])
def update_entra_user(user_id):
    try:
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

        return jsonify({
            "message": "Entra user updated successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Audit logs are disabled for now because the app no longer uses MySQL.
@app.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    return jsonify([]), 200


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
