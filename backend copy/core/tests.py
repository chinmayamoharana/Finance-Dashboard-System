from importlib.util import find_spec
from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, FinancialRecord, User

REPORTLAB_INSTALLED = find_spec('reportlab') is not None
OPENPYXL_INSTALLED = find_spec('openpyxl') is not None


class FinanceApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            password='Password123!',
            email='admin@example.com',
            name='Admin User',
            role=User.Role.ADMIN,
        )
        self.analyst = User.objects.create_user(
            username='analyst',
            password='Password123!',
            email='analyst@example.com',
            name='Analyst User',
            role=User.Role.ANALYST,
        )
        self.viewer = User.objects.create_user(
            username='viewer',
            password='Password123!',
            email='viewer@example.com',
            name='Viewer User',
            role=User.Role.VIEWER,
        )
        FinancialRecord.objects.create(
            amount=Decimal('1000.00'),
            record_type=FinancialRecord.RecordType.INCOME,
            category='Salary',
            transaction_date=date(2026, 4, 1),
            notes='April salary',
            created_by=self.admin,
            updated_by=self.admin,
        )
        FinancialRecord.objects.create(
            amount=Decimal('200.00'),
            record_type=FinancialRecord.RecordType.EXPENSE,
            category='Groceries',
            transaction_date=date(2026, 4, 2),
            notes='Weekly grocery run',
            created_by=self.admin,
            updated_by=self.admin,
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def test_viewer_cannot_access_records_list(self):
        self.authenticate(self.viewer)
        response = self.client.get('/api/records/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_analyst_can_read_records_but_cannot_create(self):
        self.authenticate(self.analyst)
        list_response = self.client.get('/api/records/')
        create_response = self.client.post(
            '/api/records/',
            {
                'amount': '250.00',
                'record_type': 'expense',
                'category': 'Travel',
                'transaction_date': '2026-04-03',
                'notes': 'Cab fares',
            },
            format='json',
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_record(self):
        self.authenticate(self.admin)
        response = self.client.post(
            '/api/records/',
            {
                'amount': '250.00',
                'record_type': 'expense',
                'category': 'Travel',
                'transaction_date': '2026-04-03',
                'notes': 'Cab fares',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FinancialRecord.objects.count(), 3)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.admin,
                action=AuditLog.Action.CREATE,
                object_type='financial_record',
            ).exists()
        )

    def test_admin_can_export_records_as_csv(self):
        self.authenticate(self.admin)
        response = self.client.get('/api/exports/records/', {'format': 'csv'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        content = response.content.decode('utf-8')
        self.assertIn('Transaction Date', content)
        self.assertIn('Salary', content)
        self.assertIn('Groceries', content)

    def test_analyst_can_export_records_as_pdf(self):
        self.authenticate(self.analyst)
        response = self.client.get('/api/exports/records/', {'format': 'pdf'})
        expected_status = status.HTTP_200_OK if REPORTLAB_INSTALLED else status.HTTP_503_SERVICE_UNAVAILABLE
        self.assertEqual(response.status_code, expected_status)
        if REPORTLAB_INSTALLED:
            self.assertEqual(response['Content-Type'], 'application/pdf')
            self.assertTrue(response.content.startswith(b'%PDF'))
        else:
            self.assertIn('reportlab', response.data['detail'].lower())

    def test_viewer_cannot_export_records(self):
        self.authenticate(self.viewer)
        response = self.client.get('/api/exports/records/', {'format': 'csv'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_export_users_as_excel(self):
        self.authenticate(self.admin)
        response = self.client.get('/api/exports/users/', {'format': 'xlsx'})
        expected_status = status.HTTP_200_OK if OPENPYXL_INSTALLED else status.HTTP_503_SERVICE_UNAVAILABLE
        self.assertEqual(response.status_code, expected_status)
        if OPENPYXL_INSTALLED:
            self.assertEqual(
                response['Content-Type'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            self.assertIn('attachment; filename=', response['Content-Disposition'])
        else:
            self.assertIn('openpyxl', response.data['detail'].lower())

    def test_analyst_cannot_export_users(self):
        self.authenticate(self.analyst)
        response = self.client.get('/api/exports/users/', {'format': 'csv'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_summary_returns_expected_totals(self):
        self.authenticate(self.viewer)
        response = self.client.get('/api/dashboard/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totals']['income'], Decimal('1000'))
        self.assertEqual(response.data['totals']['expenses'], Decimal('200'))
        self.assertEqual(response.data['totals']['net_balance'], Decimal('800'))

    def test_admin_can_create_users(self):
        self.authenticate(self.admin)
        response = self.client.post(
            '/api/users/',
            {
                'username': 'newviewer',
                'password': 'Password123!',
                'email': 'newviewer@example.com',
                'name': 'New Viewer',
                'role': 'viewer',
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newviewer').exists())
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.admin,
                action=AuditLog.Action.CREATE,
                object_type='user',
            ).exists()
        )

    def test_public_registration_creates_user(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'newanalyst',
                'password': 'Password123!',
                'email': 'newanalyst@example.com',
                'name': 'New Analyst',
                'role': 'analyst',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newanalyst').exists())
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.REGISTER,
                object_type='user',
                object_id=User.objects.get(username='newanalyst').id,
            ).exists()
        )

    def test_public_registration_rejects_duplicate_email(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'anotheruser',
                'password': 'Password123!',
                'email': 'viewer@example.com',
                'name': 'Duplicate Email User',
                'role': 'viewer',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['email'][0], 'Email already exists.')

    def test_public_registration_rejects_duplicate_username(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'viewer',
                'password': 'Password123!',
                'email': 'viewer2@example.com',
                'name': 'Duplicate Username User',
                'role': 'viewer',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['username'][0], 'Username already exists.')

    def test_refresh_rotation_blacklists_old_refresh_token(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'admin', 'password': 'Password123!'},
            format='json',
        )
        old_refresh = login_response.data['refresh']

        refresh_response = self.client.post(
            '/api/auth/refresh/',
            {'refresh': old_refresh},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', refresh_response.data)
        self.assertNotEqual(refresh_response.data['refresh'], old_refresh)

        old_refresh_reuse = self.client.post(
            '/api/auth/refresh/',
            {'refresh': old_refresh},
            format='json',
        )
        self.assertEqual(old_refresh_reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_record_is_soft_delete_and_hidden_from_queries(self):
        self.authenticate(self.admin)
        record = FinancialRecord.objects.first()

        delete_response = self.client.delete(f'/api/records/{record.id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(FinancialRecord.objects.filter(id=record.id).exists())
        self.assertTrue(FinancialRecord.all_objects.filter(id=record.id, is_deleted=True).exists())

        detail_response = self.client.get(f'/api/records/{record.id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

        dashboard_response = self.client.get('/api/dashboard/summary/')
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_response.data['totals']['record_count'], 1)

        self.assertTrue(
            AuditLog.objects.filter(
                user=self.admin,
                action=AuditLog.Action.DELETE,
                object_type='financial_record',
                object_id=record.id,
            ).exists()
        )

    def test_registration_requires_strong_password(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'weakpassuser',
                'password': 'password',
                'email': 'weakpass@example.com',
                'name': 'Weak Password User',
                'role': 'viewer',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            any('uppercase' in str(message).lower() for message in response.data['password'])
        )
