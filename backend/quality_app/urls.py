from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QualityReportViewSet

router = DefaultRouter()
router.register(r'', QualityReportViewSet, basename='quality')

urlpatterns = [path('', include(router.urls))]
