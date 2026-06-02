from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AssetCategoryViewSet, AnomalyViewSet

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet, basename='asset-category')
router.register(r'anomalies', AnomalyViewSet, basename='anomaly')
router.register(r'',           AssetViewSet,         basename='asset')

urlpatterns = [
    path('', include(router.urls)),
]
