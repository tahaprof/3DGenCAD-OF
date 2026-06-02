from django.db import models
from django.conf import settings
from conversions_app.models import Conversion


class QualityReport(models.Model):
    class FlagStatus(models.TextChoices):
        NONE     = 'none',     'None'
        FLAGGED  = 'flagged',  'Flagged'
        RESOLVED = 'resolved', 'Resolved'

    conversion       = models.OneToOneField(Conversion, on_delete=models.CASCADE, related_name='quality_report')
    code_valid       = models.BooleanField(default=False)
    geometry_valid   = models.BooleanField(default=False)
    quality_score    = models.FloatField(default=0.0)     # 0.0 – 1.0
    flag_status      = models.CharField(max_length=20, choices=FlagStatus.choices, default=FlagStatus.NONE)
    flag_comment     = models.TextField(blank=True)
    flagged_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='flagged_reports'
    )
    flagged_at       = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quality_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f'QualityReport #{self.id} — Score: {self.quality_score:.2f} [{self.flag_status}]'
