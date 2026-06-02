from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    class EntityType(models.TextChoices):
        ASSET      = 'Asset',      'Asset'
        DOCUMENT   = 'Document',   'Document'
        CONVERSION = 'Conversion', 'Conversion'
        USER       = 'User',       'User'
        QUALITY    = 'Quality',    'Quality'

    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='audit_logs'
    )
    action      = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=30, choices=EntityType.choices, blank=True)
    entity_id   = models.CharField(max_length=50, blank=True)
    payload     = models.JSONField(null=True, blank=True)   # before/after snapshot
    ip_addr     = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.full_name if self.user else 'System'
        return f'[{self.created_at:%Y-%m-%d %H:%M}] {user_str} — {self.action}'

    @classmethod
    def log(cls, user, action, entity_type='', entity_id='', payload=None, request=None):
        """Helper to create a log entry from anywhere in the codebase."""
        ip = None
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        cls.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            payload=payload,
            ip_addr=ip,
        )
