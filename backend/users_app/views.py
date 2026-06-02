from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import User, PasswordResetCode
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, ChangePasswordSerializer
from .permissions import IsAdmin
import random
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for users.
    GET /api/users/me/ → any authenticated user can view their own profile.
    """
    queryset = User.objects.all().order_by('last_name')
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ['me', 'change_password']:
            return [IsAuthenticated()]
        if self.action in ['request_reset', 'verify_reset']:
            return [AllowAny()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        """Create a user and return the full profile."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """Deactivate instead of hard-delete to preserve audit trail."""
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'You cannot deactivate yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save()
        return Response({'detail': 'User deactivated.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Return the currently authenticated user's profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='change-password')
    def change_password(self, request):
        """Allow authenticated user to change their own password."""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.must_change_password = False
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='request-reset')
    def request_reset(self, request):
        """Request a password reset code."""
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response({'detail': 'Employee ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'If the user exists, a code has been sent.'})
            
        if not user.email:
            return Response({'detail': 'User has no email registered.'}, status=status.HTTP_400_BAD_REQUEST)
            
        code = ''.join(random.choices('0123456789', k=4))
        PasswordResetCode.objects.create(user=user, code=code)
        
        try:
            send_mail(
                'Password Reset Code',
                f'Your password reset code is: {code}',
                'noreply@frl.dz',
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            return Response({'detail': f'Failed to send email, but code generated for dev: {code}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'detail': 'Code sent successfully.'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='verify-reset')
    def verify_reset(self, request):
        """Verify code and reset password."""
        employee_id = request.data.get('employee_id')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        
        if not all([employee_id, code]):
            return Response({'detail': 'Employee ID and code are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid user or code.'}, status=status.HTTP_400_BAD_REQUEST)
            
        reset_code = PasswordResetCode.objects.filter(user=user).first()
        
        if not reset_code:
            return Response({'detail': 'No reset code found.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if reset_code.code != code:
            return Response({'detail': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if timezone.now() > reset_code.created_at + timedelta(minutes=10):
            return Response({'detail': 'Code expired.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if new_password:
            user.set_password(new_password)
            user.must_change_password = False
            user.save()
            reset_code.delete()
            return Response({'detail': 'Password reset successfully.'})
            
        return Response({'detail': 'Code verified successfully.'})
