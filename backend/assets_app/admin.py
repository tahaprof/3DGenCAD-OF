from django.contrib import admin
from .models import Asset, AssetCategory, Anomaly

admin.site.register(AssetCategory)
admin.site.register(Asset)
admin.site.register(Anomaly)
