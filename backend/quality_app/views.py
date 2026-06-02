from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import QualityReport
from .serializers import QualityReportSerializer, FlagSerializer
from users_app.permissions import IsAdmin, IsNotViewer


class QualityReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/quality/               → Admin & Manager
    GET  /api/quality/{id}/          → all authenticated
    POST /api/quality/{id}/flag/     → non-Viewers (report defective conversion)
    POST /api/quality/{id}/resolve/  → Admin only
    """
    queryset = QualityReport.objects.select_related(
        'conversion', 'conversion__document', 'flagged_by'
    ).all()
    serializer_class = QualityReportSerializer

    def get_permissions(self):
        if self.action in ['flag']:
            return [IsNotViewer()]
        if self.action in ['resolve']:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        flag_status = self.request.query_params.get('flag_status')
        if flag_status:
            qs = qs.filter(flag_status=flag_status)
        return qs

    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flag a quality report as defective."""
        report = self.get_object()
        serializer = FlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report.flag_status  = QualityReport.FlagStatus.FLAGGED
        report.flag_comment = serializer.validated_data['flag_comment']
        report.flagged_by   = request.user
        report.flagged_at   = timezone.now()
        report.save()
        return Response(QualityReportSerializer(report, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Admin resolves a flagged report."""
        report = self.get_object()
        if report.flag_status != QualityReport.FlagStatus.FLAGGED:
            return Response({'detail': 'Report is not flagged.'}, status=status.HTTP_400_BAD_REQUEST)
        report.flag_status = QualityReport.FlagStatus.RESOLVED
        report.save()
        return Response(QualityReportSerializer(report, context={'request': request}).data)
