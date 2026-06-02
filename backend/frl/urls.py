from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/', include('users_app.auth_urls')),

    # App endpoints
    path('api/users/', include('users_app.urls')),
    path('api/assets/', include('assets_app.urls')),
    path('api/documents/', include('documents_app.urls')),
    path('api/conversions/', include('conversions_app.urls')),
    path('api/quality/', include('quality_app.urls')),
    path('api/audit/', include('audit_app.urls')),

    # API Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
