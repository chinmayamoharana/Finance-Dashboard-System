from importlib import import_module


try:
    import_module('MySQLdb')
except ImportError:
    try:
        pymysql = import_module('pymysql')
    except ImportError:
        pymysql = None
    else:
        pymysql.install_as_MySQLdb()
