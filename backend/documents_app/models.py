from django.db import models
from django.conf import settings
from assets_app.models import Asset


class Document(models.Model):
    class Format(models.TextChoices):
        PDF  = 'PDF',  'PDF'
        PNG  = 'PNG',  'PNG'
        JPG  = 'JPG',  'JPG'
        JPEG = 'JPEG', 'JPEG'

    asset       = models.ForeignKey(Asset, on_delete=models.SET_NULL, related_name='documents', null=True, blank=True)
    filename    = models.CharField(max_length=255)
    file        = models.FileField(upload_to='documents/')
    format      = models.CharField(max_length=10, choices=Format.choices)
    file_size_kb = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='uploaded_documents'
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.filename} → {self.asset.tag}'

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size_kb = self.file.size // 1024
            ext = self.filename.split('.')[-1].upper()
            self.format = ext if ext in ('PDF', 'PNG', 'JPG', 'JPEG') else self.format
        super().save(*args, **kwargs)
