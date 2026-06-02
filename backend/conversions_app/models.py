from django.db import models
from django.conf import settings
from documents_app.models import Document


class Conversion(models.Model):
    class Status(models.TextChoices):
        WAITING     = 'waiting',     'Waiting'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED   = 'completed',   'Completed'
        FAILED      = 'failed',      'Failed'

    document      = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='conversions')
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='triggered_conversions'
    )
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    progress      = models.PositiveSmallIntegerField(default=0)   # 0-100
    cadquery_code = models.TextField(blank=True)
    error_code    = models.CharField(max_length=50, blank=True)
    error_message = models.TextField(blank=True)
    started_at    = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'conversions'
        ordering = ['-id']

    def __str__(self):
        return f'Conversion #{self.id} [{self.status}] — {self.document.filename}'


class Model3D(models.Model):
    class Format(models.TextChoices):
        STEP = 'STEP', 'STEP'
        STL  = 'STL',  'STL'
        GLTF = 'GLTF', 'GLTF'
        PY   = 'PY',   'Python/CadQuery'

    conversion   = models.ForeignKey(Conversion, on_delete=models.CASCADE, related_name='models')
    format       = models.CharField(max_length=10, choices=Format.choices)
    file         = models.FileField(upload_to='models3d/')
    file_size_kb = models.PositiveIntegerField(default=0)
    version      = models.PositiveSmallIntegerField(default=1)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'models3d'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.format} v{self.version} — Conversion #{self.conversion_id}'
