from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    asset_tag      = serializers.CharField(source='asset.tag', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url       = serializers.SerializerMethodField()

    class Meta:
        model  = Document
        fields = [
            'id', 'asset', 'asset_tag', 'filename',
            'file', 'file_url', 'format', 'file_size_kb',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_size_kb', 'format', 'created_at', 'filename']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def create(self, validated_data):
        file = validated_data.get('file')
        if file:
            validated_data['filename'] = file.name
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)
