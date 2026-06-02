from rest_framework import serializers
from .models import Asset, AssetCategory, Anomaly
from users_app.serializers import UserSerializer


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = AssetCategory
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)

    class Meta:
        model  = Asset
        fields = [
            'id', 'reference', 'tag', 'description', 'site', 'system',
            'category', 'category_name',
            'criticality', 'stage', 'status', 'health',
            'equipment_type', 'manufacturer', 'model', 'serial_number',
            'material', 'design_code', 'weight', 'commissioned_date',
            'created_by', 'created_by_name',
            'assigned_to', 'assigned_to_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AssetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model  = Asset
        fields = [
            'id', 'reference', 'tag', 'description', 'site',
            'system', 'category_name', 'criticality', 'stage', 'status', 'health',
            'created_at',
        ]


class AnomalySerializer(serializers.ModelSerializer):
    asset_reference = serializers.CharField(source='asset.reference', read_only=True)
    asset_tag = serializers.CharField(source='asset.tag', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True)

    class Meta:
        model = Anomaly
        fields = [
            'id', 'asset', 'asset_reference', 'asset_tag', 'title', 'description',
            'severity', 'status', 'reported_by', 'reported_by_name',
            'reported_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reported_by', 'reported_at', 'updated_at']

    def create(self, validated_data):
        validated_data['reported_by'] = self.context['request'].user
        return super().create(validated_data)
