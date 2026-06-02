from rest_framework import serializers
from .models import QualityReport


class QualityReportSerializer(serializers.ModelSerializer):
    conversion_status = serializers.CharField(source='conversion.status', read_only=True)
    document_filename = serializers.CharField(source='conversion.document.filename', read_only=True)
    flagged_by_name   = serializers.CharField(source='flagged_by.full_name', read_only=True)

    class Meta:
        model  = QualityReport
        fields = [
            'id', 'conversion', 'conversion_status', 'document_filename',
            'code_valid', 'geometry_valid', 'quality_score',
            'flag_status', 'flag_comment',
            'flagged_by', 'flagged_by_name', 'flagged_at',
            'created_at',
        ]
        read_only_fields = ['id', 'flagged_by', 'flagged_at', 'created_at']


class FlagSerializer(serializers.Serializer):
    flag_comment = serializers.CharField(required=True, allow_blank=False)
