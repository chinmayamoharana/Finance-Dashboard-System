from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/refresh/', views.refresh_view, name='refresh'),
    path('auth/me/', views.me_view, name='me'),
    path('users/', views.users_view, name='users'),
    path('users/<int:user_id>/', views.user_detail_view, name='user-detail'),
    path('exports/users/', views.users_export_view, name='users-export'),
    path('records/', views.records_view, name='records'),
    path('records/<int:record_id>/', views.record_detail_view, name='record-detail'),
    path('exports/records/', views.records_export_view, name='records-export'),
    path('dashboard/summary/', views.dashboard_summary_view, name='dashboard-summary'),
]
