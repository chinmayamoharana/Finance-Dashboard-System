from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import FinancialRecord, User


class Command(BaseCommand):
    help = 'Seed demo users and financial records for the finance dashboard.'

    def handle(self, *args, **options):
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'name': 'System Admin',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            },
        )
        admin_user.role = User.Role.ADMIN
        admin_user.email = admin_user.email or 'admin@example.com'
        admin_user.name = admin_user.name or 'System Admin'
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password('Password123!')
        admin_user.save()

        analyst_user, _ = User.objects.get_or_create(
            username='analyst',
            defaults={
                'email': 'analyst@example.com',
                'name': 'Finance Analyst',
                'role': User.Role.ANALYST,
            },
        )
        analyst_user.role = User.Role.ANALYST
        analyst_user.email = analyst_user.email or 'analyst@example.com'
        analyst_user.name = analyst_user.name or 'Finance Analyst'
        analyst_user.set_password('Password123!')
        analyst_user.save()

        viewer_user, _ = User.objects.get_or_create(
            username='viewer',
            defaults={
                'email': 'viewer@example.com',
                'name': 'Dashboard Viewer',
                'role': User.Role.VIEWER,
            },
        )
        viewer_user.role = User.Role.VIEWER
        viewer_user.email = viewer_user.email or 'viewer@example.com'
        viewer_user.name = viewer_user.name or 'Dashboard Viewer'
        viewer_user.set_password('Password123!')
        viewer_user.save()

        FinancialRecord.all_objects.all().delete()

        today = date.today()
        sample_records = [
            ('income', 'Salary', Decimal('85000.00'), today - timedelta(days=30), 'Monthly salary'),
            ('expense', 'Rent', Decimal('22000.00'), today - timedelta(days=28), 'Office rent'),
            ('expense', 'Utilities', Decimal('5400.00'), today - timedelta(days=24), 'Internet and electricity'),
            ('income', 'Consulting', Decimal('18000.00'), today - timedelta(days=18), 'Client billing'),
            ('expense', 'Marketing', Decimal('7600.00'), today - timedelta(days=14), 'Campaign spend'),
            ('expense', 'Travel', Decimal('3200.00'), today - timedelta(days=10), 'Client meeting travel'),
            ('income', 'Investments', Decimal('9200.00'), today - timedelta(days=5), 'Dividend income'),
            ('expense', 'Software', Decimal('2100.00'), today - timedelta(days=2), 'SaaS subscriptions'),
        ]

        for record_type, category, amount, transaction_date, notes in sample_records:
            FinancialRecord.objects.create(
                record_type=record_type,
                category=category,
                amount=amount,
                transaction_date=transaction_date,
                notes=notes,
                created_by=admin_user,
                updated_by=admin_user,
            )

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully.'))
