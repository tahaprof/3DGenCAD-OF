from rest_framework import mixins, viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    GET /api/audit/     → All authenticated users
    GET /api/audit/{id}/ → All authenticated users
    """
    queryset           = AuditLog.objects.select_related('user').all()
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['action', 'entity_type', 'entity_id', 'user__email']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        entity_type = self.request.query_params.get('entity_type')
        user_id     = self.request.query_params.get('user')
        if entity_type: qs = qs.filter(entity_type=entity_type)
        if user_id:     qs = qs.filter(user__id=user_id)
        return qs
