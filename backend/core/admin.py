from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AuditLog, FinancialRecord, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Finance Dashboard', {'fields': ('name', 'role', 'created_at', 'updated_at')}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ('Finance Dashboard', {'fields': ('name', 'email', 'role')}),
    )
    list_display = ('username', 'email', 'name', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    readonly_fields = ('created_at', 'updated_at')
    search_fields = ('username', 'email', 'name')


@admin.register(FinancialRecord)
class FinancialRecordAdmin(admin.ModelAdmin):
    list_display = ('transaction_date', 'record_type', 'category', 'amount', 'created_by', 'is_deleted')
    list_filter = ('record_type', 'category', 'transaction_date', 'is_deleted')
    search_fields = ('category', 'notes', 'created_by__username', 'created_by__name')

    def get_queryset(self, request):
        return FinancialRecord.all_objects.select_related('created_by', 'updated_by')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'object_type', 'object_id')
    list_filter = ('action', 'object_type', 'timestamp')
    search_fields = ('user__username', 'object_type')
    readonly_fields = ('timestamp',)
