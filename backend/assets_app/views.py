from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Asset, AssetCategory, Anomaly
from .serializers import AssetSerializer, AssetListSerializer, AssetCategorySerializer, AnomalySerializer
from users_app.permissions import IsAdmin, IsAdminOrManager, IsNotViewer


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """
    GET    /api/assets/categories/       → all authenticated
    POST   /api/assets/categories/       → Admin only
    PUT    /api/assets/categories/{id}/  → Admin only
    DELETE /api/assets/categories/{id}/  → Admin only
    """
    queryset           = AssetCategory.objects.all()
    serializer_class   = AssetCategorySerializer
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name']

    def get_permissions(self):
        if self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AssetViewSet(viewsets.ModelViewSet):
    """
    GET    /api/assets/        → all authenticated (list with filters)
    POST   /api/assets/        → Admin or Manager
    GET    /api/assets/{id}/   → all authenticated
    PUT    /api/assets/{id}/   → Admin or Manager
    DELETE /api/assets/{id}/   → Admin or Manager
    """
    queryset        = Asset.objects.select_related('category', 'created_by', 'assigned_to').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['reference', 'tag', 'description', 'manufacturer', 'site']
    ordering_fields = ['reference', 'tag', 'health', 'created_at', 'criticality']
    ordering        = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrManager()]

    def get_serializer_class(self):
        if self.action == 'list':
            return AssetListSerializer
        return AssetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional query-param filters
        site        = self.request.query_params.get('site')
        system      = self.request.query_params.get('system')
        stage       = self.request.query_params.get('stage')
        criticality = self.request.query_params.get('criticality')
        category    = self.request.query_params.get('category')

        if site:        qs = qs.filter(site__icontains=site)
        if system:      qs = qs.filter(system__icontains=system)
        if stage:       qs = qs.filter(stage=stage)
        if criticality: qs = qs.filter(criticality=criticality)
        if category:    qs = qs.filter(category__id=category)
        return qs

    def perform_create(self, serializer):
        asset = serializer.save(created_by=self.request.user)
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Created asset: {asset.reference} ({asset.tag})",
            entity_type='Asset',
            entity_id=asset.id,
            request=self.request
        )

    def perform_update(self, serializer):
        asset = serializer.save()
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Updated asset details: {asset.reference}",
            entity_type='Asset',
            entity_id=asset.id,
            request=self.request
        )

    def perform_destroy(self, instance):
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Deleted asset: {instance.reference}",
            entity_type='Asset',
            entity_id=instance.id,
            request=self.request
        )
        instance.delete()


class AnomalyViewSet(viewsets.ModelViewSet):
    """
    GET    /api/assets/anomalies/       → all authenticated
    POST   /api/assets/anomalies/       → Admin, Manager, Technician
    GET    /api/assets/anomalies/{id}/  → all authenticated
    PUT    /api/assets/anomalies/{id}/  → Admin, Manager, Technician
    DELETE /api/assets/anomalies/{id}/  → Admin, Manager, Technician
    """
    queryset = Anomaly.objects.select_related('asset', 'reported_by').all()
    serializer_class = AnomalySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'asset__reference', 'asset__tag']
    ordering_fields = ['reported_at', 'severity', 'status']
    ordering = ['-reported_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsNotViewer()]

    def get_queryset(self):
        qs = super().get_queryset()
        asset_id = self.request.query_params.get('asset')
        status = self.request.query_params.get('status')
        severity = self.request.query_params.get('severity')

        if asset_id: qs = qs.filter(asset_id=asset_id)
        if status:   qs = qs.filter(status=status)
        if severity: qs = qs.filter(severity=severity)
        return qs

    def perform_create(self, serializer):
        anomaly = serializer.save()
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Reported anomaly: {anomaly.title} on {anomaly.asset.reference}",
            entity_type='Anomaly',
            entity_id=anomaly.id,
            request=self.request
        )

    def perform_update(self, serializer):
        anomaly = serializer.save()
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Updated anomaly: {anomaly.title} (Status: {anomaly.status})",
            entity_type='Anomaly',
            entity_id=anomaly.id,
            request=self.request
        )

    def perform_destroy(self, instance):
        from audit_app.models import AuditLog
        AuditLog.log(
            user=self.request.user,
            action=f"Deleted anomaly: {instance.title}",
            entity_type='Anomaly',
            entity_id=instance.id,
            request=self.request
        )
        instance.delete()
