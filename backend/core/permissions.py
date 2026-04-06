import logging

from rest_framework.permissions import BasePermission

from .models import User

logger = logging.getLogger(__name__)


def is_active_authenticated(user):
    return bool(user and user.is_authenticated and user.is_active)


def is_viewer(user):
    return is_active_authenticated(user) and user.role == User.Role.VIEWER


def is_analyst(user):
    return is_active_authenticated(user) and user.role == User.Role.ANALYST


def is_admin(user):
    return is_active_authenticated(user) and user.role == User.Role.ADMIN


def can_access_dashboard(user):
    return is_active_authenticated(user) and user.role in {
        User.Role.VIEWER,
        User.Role.ANALYST,
        User.Role.ADMIN,
    }


def can_view_records(user):
    return is_active_authenticated(user) and user.role in {
        User.Role.ANALYST,
        User.Role.ADMIN,
    }


def _log_denied(request, message):
    username = getattr(request.user, 'username', 'anonymous')
    logger.warning(
        'Unauthorized attempt: user=%s method=%s path=%s reason=%s',
        username,
        request.method,
        request.path,
        message,
    )


class IsActiveAuthenticated(BasePermission):
    message = 'Authentication credentials were not provided or the account is inactive.'

    def has_permission(self, request, view):
        allowed = is_active_authenticated(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed


class IsViewer(BasePermission):
    message = 'Only viewer users can access this resource.'

    def has_permission(self, request, view):
        allowed = is_viewer(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed


class IsAnalyst(BasePermission):
    message = 'Only analyst users can access this resource.'

    def has_permission(self, request, view):
        allowed = is_analyst(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed


class IsAdmin(BasePermission):
    message = 'Only admins can access this resource.'

    def has_permission(self, request, view):
        allowed = is_admin(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed


class CanAccessDashboard(BasePermission):
    message = 'Only viewers, analysts, and admins can view the dashboard summary.'

    def has_permission(self, request, view):
        allowed = can_access_dashboard(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed


class CanAccessRecords(BasePermission):
    message = 'You do not have permission to access financial records.'

    def has_permission(self, request, view):
        user = request.user
        if request.method == 'GET':
            allowed = can_view_records(user)
        else:
            allowed = is_admin(user)
            if allowed:
                return True
            self.message = 'Only admins can modify financial records.'

        if not allowed:
            _log_denied(request, self.message)
        return allowed


class CanManageUsers(BasePermission):
    message = 'Only admins can manage users.'

    def has_permission(self, request, view):
        allowed = is_admin(request.user)
        if not allowed:
            _log_denied(request, self.message)
        return allowed
