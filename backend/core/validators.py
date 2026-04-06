import re

from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', password):
            raise ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'\d', password):
            raise ValidationError('Password must contain at least one number.')
        if not re.search(r'[^A-Za-z0-9]', password):
            raise ValidationError('Password must contain at least one symbol.')

    def get_help_text(self):
        return (
            'Your password must contain at least one uppercase letter, one lowercase '
            'letter, one number, and one symbol.'
        )
