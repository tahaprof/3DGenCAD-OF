from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    def create_user(self, employee_id, password=None, **extra_fields):
        if not employee_id:
            raise ValueError('Employee ID is required')
        user = self.model(employee_id=employee_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, employee_id, password=None, **extra_fields):
        extra_fields.setdefault('role', 'Admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(employee_id, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN      = 'Admin',      'Admin'
        MANAGER    = 'Manager',    'Manager'
        TECHNICIAN = 'Technician', 'Technician'
        VIEWER     = 'Viewer',     'Viewer'

    employee_id = models.CharField(max_length=50, unique=True)
    email      = models.EmailField(unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNICIAN)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)  # required for Django admin
    must_change_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = 'employee_id'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.role})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'password_reset_codes'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.employee_id} - {self.code}'
