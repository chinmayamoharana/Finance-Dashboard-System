# Finance Dashboard System

A full-stack finance dashboard built with a Django backend and a React frontend. The application focuses on role-based access, financial record management, dashboard analytics, auditability, and practical admin workflows.

## Current Application Features

- JWT-based registration, login, profile fetch, and refresh token rotation
- role-based access control for `viewer`, `analyst`, and `admin`
- dashboard analytics with totals, monthly trends, category breakdown, and recent activity
- financial record listing with filters, pagination, and admin-only create/update/delete
- admin-only user management with search, role filter, and status filter
- soft delete for financial records
- audit log persistence for key actions
- request throttling and security-focused logging
- WhatsApp text sharing
  - `admin`: can share full filtered records and full filtered user lists
  - `analyst`: can share full filtered records
  - `viewer`: cannot share
- frontend request optimizations
  - debounced search/filter inputs
  - cancellation of stale in-flight requests
  - lighter backend list queries for records, users, and dashboard activity

## Role Access Matrix

| Feature | Viewer | Analyst | Admin |
| --- | --- | --- | --- |
| Register/Login | Yes | Yes | Yes |
| Dashboard Summary | Yes | Yes | Yes |
| View Records | No | Yes | Yes |
| Share Records to WhatsApp | No | Yes | Yes |
| Create Record | No | No | Yes |
| Update Record | No | No | Yes |
| Delete Record | No | No | Yes |
| View Users | No | No | Yes |
| Manage Users | No | No | Yes |
| Share User List to WhatsApp | No | No | Yes |

## Tech Stack

### Backend

- Django 5
- Django REST Framework
- Simple JWT with blacklist support
- MySQL
- django-cors-headers
- WhiteNoise
- Waitress

### Frontend

- React 19
- Vite 7
- React Router
- Tailwind CSS
- Axios
- Recharts

## Architecture

```text
React Frontend
  ->
Axios Client with JWT Refresh
  ->
Django Function-Based API Views
  ->
MySQL Database
```

## Project Structure

```text
Finance Dashboard System/
├── backend/
│   ├── config/
│   ├── core/
│   ├── .env.example
│   ├── manage.py
│   └── serve.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
├── Procfile
├── requirements.txt
└── README.md
```

## Main Backend Modules

- [backend/core/models.py](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/core/models.py)
  Custom `User`, `FinancialRecord`, and `AuditLog` models.
- [backend/core/views.py](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/core/views.py)
  Function-based API views for auth, users, records, exports, and dashboard summary.
- [backend/core/permissions.py](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/core/permissions.py)
  Role-aware and feature-aware permission classes.
- [backend/core/serializers.py](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/core/serializers.py)
  Validation and response serialization.
- [backend/core/management/commands/seed_demo_data.py](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/core/management/commands/seed_demo_data.py)
  Seeds demo users and sample financial data.

## Main Frontend Modules

- [frontend/src/App.jsx](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/App.jsx)
  App routes and protected route setup.
- [frontend/src/api/client.js](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/api/client.js)
  Axios client with automatic JWT header injection and refresh logic.
- [frontend/src/pages/DashboardPage.jsx](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/pages/DashboardPage.jsx)
  Financial overview, charts, category totals, and recent activity.
- [frontend/src/pages/RecordsPage.jsx](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/pages/RecordsPage.jsx)
  Record filters, pagination, CRUD form for admins, and WhatsApp text sharing for allowed roles.
- [frontend/src/pages/UsersPage.jsx](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/pages/UsersPage.jsx)
  Admin-only user list, create/edit form, and WhatsApp text sharing of filtered users.
- [frontend/src/hooks/useDebouncedValue.js](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/src/hooks/useDebouncedValue.js)
  Shared debouncing hook used to reduce repeated API requests.

## Data Model

### User

Fields:

- `username`
- `email`
- `name`
- `role`
- `is_active`
- `created_at`
- `updated_at`

Rules:

- username must be unique
- email must be unique
- inactive users cannot access protected APIs

### FinancialRecord

Fields:

- `amount`
- `record_type`
- `category`
- `transaction_date`
- `notes`
- `created_by`
- `updated_by`
- `is_deleted`
- `created_at`
- `updated_at`

Rules:

- amount must be at least `0.01`
- deleted records are soft deleted
- dashboard and list queries exclude soft-deleted records

### AuditLog

Fields:

- `user`
- `action`
- `object_type`
- `object_id`
- `timestamp`

Purpose:

- keeps an audit trail for registration, login, record changes, and user management events

## API Endpoints

Base URL:

```text
http://127.0.0.1:8000/api
```

### Health

- `GET /health/`

### Authentication

- `POST /auth/register/`
- `POST /auth/login/`
- `POST /auth/refresh/`
- `GET /auth/me/`

### Users

Admin only:

- `GET /users/`
- `POST /users/`
- `GET /users/<id>/`
- `PUT /users/<id>/`
- `PATCH /users/<id>/`

Supported filters:

- `search`
- `role`
- `status`

### Records

- `GET /records/` for `analyst` and `admin`
- `POST /records/` for `admin`
- `GET /records/<id>/` for `analyst` and `admin`
- `PUT /records/<id>/` for `admin`
- `PATCH /records/<id>/` for `admin`
- `DELETE /records/<id>/` for `admin`

Supported filters:

- `search`
- `record_type`
- `category`
- `start_date`
- `end_date`
- `page`
- `page_size`

### Dashboard Summary

- `GET /dashboard/summary/`

Supported filters:

- `record_type`
- `category`
- `search`
- `start_date`
- `end_date`

### Report Export Endpoints

The backend currently also includes report export routes:

- `GET /exports/records/`
- `GET /exports/users/`

These support file export formats on the API side, although the current frontend sharing flow uses WhatsApp text sharing instead of file download buttons.

## Dashboard Behavior

The dashboard summary endpoint returns:

- total income
- total expenses
- net balance
- record count
- category totals
- monthly trends
- recent activity

The frontend renders this with summary cards and Recharts visualizations.

## Security and Reliability

- refresh token rotation
- blacklist-after-rotation support
- backend-enforced role permissions
- login and registration throttling
- general API throttling for anonymous and authenticated traffic
- audit log storage in the database
- stronger password validation
- soft delete for records
- logging for important events and unauthorized access attempts

### Default Throttle Rates

- anonymous: `50/day`
- authenticated user: `100/day`
- login: `10/hour`
- register: `20/day`

## Performance Improvements

The current version includes a few focused performance changes without altering database setup:

- debounced text filters on records and users pages
- cancellation of stale requests when filters change quickly
- reduced backend field loading for list and dashboard queries
- more efficient refresh behavior on normal page interactions

These changes make browsing, filtering, and paging feel faster, especially while typing in search fields.

## Local Setup

### 1. Backend

Open PowerShell:

```powershell
cd "c:\Users\mohar\OneDrive\Desktop\django-rest-framework-react\Finance Dashboard System\backend"
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

If needed:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r ..\requirements.txt
```

Create the backend environment file:

```powershell
copy .env.example .env
```

Apply migrations:

```powershell
python manage.py migrate
```

Seed demo data:

```powershell
python manage.py seed_demo_data
```

Run the backend in development:

```powershell
python manage.py runserver 127.0.0.1:8000
```

Or run with Waitress:

```powershell
python serve.py
```

Notes:

- `serve.py` does not auto-reload, so restart it after backend code changes
- the current backend configuration expects MySQL environment variables to be present
- [backend/.env.example](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/.env.example) contains the required keys

### 2. Frontend

Open another terminal:

```powershell
cd "c:\Users\mohar\OneDrive\Desktop\django-rest-framework-react\Finance Dashboard System\frontend"
npm install
```

Create the frontend environment file:

```powershell
copy .env.example .env
```

Run the frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend URL:

```text
http://127.0.0.1:5173
```

Default API URL:

```text
http://127.0.0.1:8000/api
```

## Environment Variables

### Backend

Documented in [backend/.env.example](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/backend/.env.example).

Main values:

- `SECRET_KEY`
- `DEBUG`
- `MYSQLDATABASE`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLHOST`
- `MYSQLPORT`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `LOG_LEVEL`

### Frontend

Documented in [frontend/.env.example](/c:/Users/mohar/OneDrive/Desktop/django-rest-framework-react/Finance%20Dashboard%20System/frontend/.env.example).

Main value:

- `VITE_API_BASE_URL`

## Demo Accounts

After seeding demo data:

- Admin: `admin` / `Password123!`
- Analyst: `analyst` / `Password123!`
- Viewer: `viewer` / `Password123!`

## Validation and Error Handling

Examples:

- duplicate username returns `400`
- duplicate email returns `400`
- invalid credentials return `401`
- invalid or expired refresh token returns `401`
- inactive account access returns `403`
- unauthorized role access returns `403`
- missing records or users return `404`
- invalid date ranges return `400`

Delete behavior:

- deleting a record returns `204 No Content`
- the record is hidden from normal API reads
- the row is retained with `is_deleted=True`
- an audit log entry is recorded

## Testing and Build

Backend tests:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test
```

Frontend production build:

```powershell
cd frontend
npm run build
```

## Deployment Notes

- `Procfile` is included for deployment use
- WhiteNoise is configured for static files
- keep backend environment variables set correctly in the deployment platform
- run migrations after deploy
- if using Waitress locally, restart after code changes

## Future Improvements

- move dashboard aggregation into dedicated service modules
- split the backend into smaller apps
- add a restore workflow for soft-deleted records
- add an audit log UI
- add chunk splitting to reduce frontend bundle size
- add Docker support
