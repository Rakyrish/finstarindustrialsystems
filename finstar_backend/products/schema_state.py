"""
Helpers for checking whether database schema changes have been applied.
"""

from django.db import connection


def table_exists(table_name: str) -> bool:
    return table_name in connection.introspection.table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    if not table_exists(table_name):
        return False

    with connection.cursor() as cursor:
        description = connection.introspection.get_table_description(cursor, table_name)

    return any(column.name == column_name for column in description)
