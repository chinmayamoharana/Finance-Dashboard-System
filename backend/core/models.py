from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        VIEWER = 'viewer', 'Viewer'
        ANALYST = 'analyst', 'Analyst'
        ADMIN = 'admin', 'Admin'

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ['email', 'name']

    def __str__(self):
        return f'{self.username} ({self.role})'


class ActiveFinancialRecordManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class FinancialRecord(models.Model):
    class RecordType(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    record_type = models.CharField(max_length=10, choices=RecordType.choices)
    category = models.CharField(max_length=100)
    transaction_date = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_records',
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_records',
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActiveFinancialRecordManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-transaction_date', '-created_at']

    def __str__(self):
        return f'{self.record_type}: {self.category} ({self.amount})'

    def soft_delete(self, user=None):
        self.is_deleted = True
        if user:
            self.updated_by = user
        self.save(update_fields=['is_deleted', 'updated_by', 'updated_at'])


class AuditLog(models.Model):
    class Action(models.TextChoices):
        REGISTER = 'register', 'Register'
        LOGIN = 'login', 'Login'
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    object_type = models.CharField(max_length=100)
    object_id = models.PositiveBigIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp', '-id']

    def __str__(self):
        return f'{self.action} {self.object_type} #{self.object_id}'
