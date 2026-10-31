from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity

from ..errors import ApiError
from ..extensions import db
from ..repositories import AdminRepository


class AuthService:
    @staticmethod
    def admin_login(username, password):
        if not isinstance(username, str) or not isinstance(password, str):
            raise ApiError("username and password are required", 400)
        admin = AdminRepository.by_username(username.strip())
        if admin is None or not admin.is_active or not admin.check_password(password):
            raise ApiError("Invalid username or password", 401)
        token = create_access_token(
            identity=str(admin.id),
            additional_claims={"token_version": admin.token_version, "role": "admin"},
        )
        return {"access_token": token, "token_type": "Bearer", "admin": admin.to_dict()}

    @staticmethod
    def current_admin():
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError) as exc:
            raise ApiError("Invalid admin identity", 401) from exc
        admin = AdminRepository.by_id(admin_id)
        claims = get_jwt()
        if (
            admin is None
            or not admin.is_active
            or claims.get("role") != "admin"
            or claims.get("token_version") != admin.token_version
        ):
            raise ApiError("Admin session is no longer valid", 401)
        return admin

    @classmethod
    def admin_logout(cls):
        admin = cls.current_admin()
        admin.token_version += 1
        db.session.commit()
