from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Document
from .serializers import DocumentSerializer
from users_app.permissions import IsAdminOrManager, IsNotViewer


class DocumentViewSet(viewsets.ModelViewSet):
    """
    GET    /api/documents/       → all authenticated
    POST   /api/documents/       → non-Viewers (multipart/form-data)
    DELETE /api/documents/{id}/  → Admin or Manager
    """
    queryset        = Document.objects.select_related('asset', 'uploaded_by').all()
    serializer_class = DocumentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['filename', 'asset__tag', 'asset__reference']
    ordering        = ['-created_at']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        asset_id = self.request.query_params.get('asset')
        if asset_id:
            qs = qs.filter(asset__id=asset_id)
        return qs

    def perform_create(self, serializer):
        document = serializer.save()
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Uploaded document: {document.filename}",
            entity_type='Document',
            entity_id=document.id,
            request=self.request
        )
