from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only Admin role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'Admin')


class IsAdminOrManager(BasePermission):
    """Admin or Manager role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('Admin', 'Manager')
        )


class IsNotViewer(BasePermission):
    """Any authenticated user except Viewer (Admin, Manager, Technician)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role != 'Viewer'
        )


class IsAuthenticatedReadOnly(BasePermission):
    """All authenticated users can read; only non-Viewers can write."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role != 'Viewer'
