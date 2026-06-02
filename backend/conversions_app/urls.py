from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversionViewSet, Model3DViewSet

router = DefaultRouter()
router.register(r'', ConversionViewSet, basename='conversion')

models_router = DefaultRouter()
models_router.register(r'', Model3DViewSet, basename='model3d')

urlpatterns = [path('', include(router.urls))]
