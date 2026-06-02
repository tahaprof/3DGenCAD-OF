from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


urlpatterns = [
    path('login/',   CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(),          name='token_refresh'),
    path('verify/',  TokenVerifyView.as_view(),           name='token_verify'),
]
