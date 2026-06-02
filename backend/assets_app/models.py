from django.db import models
from django.conf import settings


class AssetCategory(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_categories'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = 'asset_categories'
        ordering  = ['name']
        verbose_name_plural = 'asset categories'

    def __str__(self):
        return self.name


class Asset(models.Model):
    class Criticality(models.TextChoices):
        CRITICAL = 'Critical', 'Critical'
        HIGH     = 'High',     'High'
        MEDIUM   = 'Medium',   'Medium'
        LOW      = 'Low',      'Low'

    class Stage(models.TextChoices):
        DESIGN         = 'Design',         'Design'
        PROCUREMENT    = 'Procurement',    'Procurement'
        COMMISSIONING  = 'Commissioning',  'Commissioning'
        OPERATIONAL    = 'Operational',    'Operational'
        MAINTENANCE    = 'Maintenance',    'Maintenance'
        DECOMMISSIONED = 'Decommissioned', 'Decommissioned'

    class Status(models.TextChoices):
        ACTIVE      = 'Active',      'Active'
        INACTIVE    = 'Inactive',    'Inactive'
        UNDER_MAINT = 'Maintenance', 'Maintenance'

    # Identity
    reference  = models.CharField(max_length=20, unique=True)   # AST-1045
    tag        = models.CharField(max_length=20, unique=True)   # V-201

    # Classification
    description    = models.TextField()
    site           = models.CharField(max_length=100)
    system         = models.CharField(max_length=100)
    category       = models.ForeignKey(
        AssetCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assets'
    )
    criticality    = models.CharField(max_length=20, choices=Criticality.choices, default=Criticality.HIGH)
    stage          = models.CharField(max_length=30, choices=Stage.choices, default=Stage.OPERATIONAL)
    status         = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    health         = models.PositiveSmallIntegerField(default=100)  # 0-100

    # Technical specs
    equipment_type  = models.CharField(max_length=100, blank=True)
    manufacturer    = models.CharField(max_length=100, blank=True)
    model           = models.CharField(max_length=100, blank=True)
    serial_number   = models.CharField(max_length=100, blank=True)
    material        = models.CharField(max_length=200, blank=True)
    design_code     = models.CharField(max_length=100, blank=True)
    weight          = models.CharField(max_length=50,  blank=True)
    commissioned_date = models.DateField(null=True, blank=True)

    # Relationships
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_assets'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_assets'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assets'
        ordering = ['reference']

    def __str__(self):
        return f'{self.reference} — {self.tag}'


class Anomaly(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = 'Critical', 'Critical'
        HIGH     = 'High',     'High'
        MEDIUM   = 'Medium',   'Medium'
        LOW      = 'Low',      'Low'

    class Status(models.TextChoices):
        REPORTED      = 'Reported',      'Reported'
        INVESTIGATING = 'Investigating', 'Investigating'
        RESOLVED      = 'Resolved',      'Resolved'

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='anomalies')
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REPORTED)
    
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='reported_anomalies'
    )
    reported_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'anomalies'
        ordering = ['-reported_at']
        verbose_name_plural = 'anomalies'

    def __str__(self):
        return f'Anomaly: {self.title} on {self.asset.reference}'
