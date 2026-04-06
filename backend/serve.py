import importlib
import os


def get_waitress_serve():
    try:
        waitress_module = importlib.import_module('waitress')
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            'Waitress is not available in the active Python interpreter. '
            'Activate the backend environment and install dependencies before running serve.py.'
        ) from exc

    return waitress_module.serve


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    from django.core.wsgi import get_wsgi_application

    application = get_wsgi_application()
    serve = get_waitress_serve()
    serve(application, host='127.0.0.1', port=8000)


if __name__ == '__main__':
    main()
