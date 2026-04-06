import os
from pathlib import Path

MYSQL_ENV_VARS = (
    'MYSQLDATABASE',
    'MYSQLUSER',
    'MYSQLPASSWORD',
    'MYSQLHOST',
    'MYSQLPORT',
)


def load_env_file(env_path):
    path = Path(env_path)
    if not path.exists():
        return

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name, default):
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


def mysql_env_configured():
    return all(os.getenv(name) for name in MYSQL_ENV_VARS)


def mysql_database_config():
    missing = [name for name in MYSQL_ENV_VARS if not os.getenv(name)]
    if missing:
        missing_text = ', '.join(missing)
        raise ValueError(f'Missing required MySQL environment variables: {missing_text}')

    return {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('MYSQLDATABASE'),
        'USER': os.getenv('MYSQLUSER'),
        'PASSWORD': os.getenv('MYSQLPASSWORD'),
        'HOST': os.getenv('MYSQLHOST'),
        'PORT': os.getenv('MYSQLPORT'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'connect_timeout': 10,
        },
    }


def sqlite_database_config(base_dir):
    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': Path(base_dir) / 'db.sqlite3',
    }
