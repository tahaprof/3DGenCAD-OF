from rest_framework import serializers
from .models import Conversion, Model3D


class Model3DSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model  = Model3D
        fields = ['id', 'conversion', 'format', 'file', 'file_url', 'file_size_kb', 'version', 'created_at']
        read_only_fields = ['id', 'file_size_kb', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ConversionSerializer(serializers.ModelSerializer):
    document_filename = serializers.CharField(source='document.filename', read_only=True)
    asset_tag         = serializers.CharField(source='document.asset.tag', read_only=True)
    triggered_by_name = serializers.CharField(source='user.full_name', read_only=True)
    models            = Model3DSerializer(many=True, read_only=True)

    class Meta:
        model  = Conversion
        fields = [
            'id', 'document', 'document_filename', 'asset_tag',
            'user', 'triggered_by_name',
            'status', 'progress', 'cadquery_code',
            'error_code', 'error_message',
            'started_at', 'completed_at',
            'models',
        ]
        read_only_fields = [
            'id', 'user', 'status', 'progress',
            'cadquery_code', 'error_code', 'error_message',
            'started_at', 'completed_at',
        ]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ConversionListSerializer(serializers.ModelSerializer):
    """Lightweight list view."""
    document_filename = serializers.CharField(source='document.filename', read_only=True)
    asset_tag         = serializers.CharField(source='document.asset.tag', read_only=True)

    class Meta:
        model  = Conversion
        fields = ['id', 'document_filename', 'asset_tag', 'status', 'progress', 'started_at', 'completed_at']
