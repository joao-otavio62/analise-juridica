from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.seed import ensure_default_user


class Command(BaseCommand):
    help = "Cria o usuário padrão mockado (requer SEED_ADMIN=True)."

    def handle(self, *args, **options):
        if not settings.SEED_ADMIN:
            self.stdout.write(self.style.WARNING("SEED_ADMIN=False: nada a fazer."))
            return
        user = ensure_default_user()
        self.stdout.write(self.style.SUCCESS(f"Usuário '{user.username}' pronto."))
