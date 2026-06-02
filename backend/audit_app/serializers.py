from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='System')
    employee_id = serializers.CharField(source='user.employee_id', read_only=True, default='System')

    class Meta:
        model  = AuditLog
        fields = ['id', 'user', 'user_name', 'employee_id', 'action', 'entity_type', 'entity_id', 'payload', 'ip_addr', 'created_at']
        read_only_fields = fields
