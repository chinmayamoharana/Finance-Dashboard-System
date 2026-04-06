from datetime import timedelta
from importlib.util import find_spec
from pathlib import Path
import os

from .env import (
    env_bool,
    env_list,
    load_env_file,
    mysql_database_config,
    mysql_env_configured,
    sqlite_database_config,
)

BASE_DIR = Path(__file__).resolve().parent.parent
load_env_file(BASE_DIR / '.env')

DEFAULT_SECRET_KEY = (
    'finance-dashboard-system-prod-secret-fallback-9x4r2m7k1q8v5t3z6n1p8s4w7b2c5d'
)
LOCAL_FRONTEND_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
STATICFILES_BACKEND = 'django.contrib.staticfiles.storage.StaticFilesStorage'
WHITENOISE_STATICFILES_BACKEND = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEBUG = env_bool('DEBUG', True)
USE_SQLITE = env_bool('USE_SQLITE', False)
SECRET_KEY = os.getenv('SECRET_KEY') or DEFAULT_SECRET_KEY
if SECRET_KEY in {'change-me-in-production', 'replace-with-a-long-random-secret-key'}:
    SECRET_KEY = DEFAULT_SECRET_KEY
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', ['*'])
HAS_WHITENOISE = find_spec('whitenoise') is not None
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
if HAS_WHITENOISE:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

if USE_SQLITE or not mysql_env_configured():
    DATABASES = {
        'default': sqlite_database_config(BASE_DIR)
    }
else:
    DATABASES = {
        'default': mysql_database_config()
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'core.validators.StrongPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
if HAS_WHITENOISE:
    STATICFILES_BACKEND = WHITENOISE_STATICFILES_BACKEND

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', not DEBUG)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000' if not DEBUG else '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', not DEBUG)
SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', not DEBUG)
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': STATICFILES_BACKEND,
    },
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'core.User'

CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', LOCAL_FRONTEND_ORIGINS)

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', LOCAL_FRONTEND_ORIGINS)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '50/day',
        'user': '100/day',
        'login': '10/hour',
        'register': '20/day',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'core': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}
