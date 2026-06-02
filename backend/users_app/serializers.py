from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Add user info to the JWT login response."""
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id':          self.user.id,
            'employee_id': self.user.employee_id,
            'email':       self.user.email,
            'full_name':   self.user.full_name,
            'first_name':  self.user.first_name,
            'last_name':   self.user.last_name,
            'role':        self.user.role,
            'must_change_password': self.user.must_change_password,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'employee_id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 'must_change_password', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return obj.full_name


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    employee_id = serializers.CharField(required=False)

    class Meta:
        model  = User
        fields = ['employee_id', 'email', 'first_name', 'last_name', 'role', 'password']

    def create(self, validated_data):
        if 'employee_id' not in validated_data:
            count = User.objects.count()
            validated_data['employee_id'] = f"EMP{(count + 1):03d}"
            
        if 'password' not in validated_data:
            first_name = validated_data.get('first_name', '')
            emp_id = validated_data['employee_id']
            validated_data['password'] = f"{first_name}@{emp_id}"
            
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['first_name', 'last_name', 'role', 'is_active']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value
