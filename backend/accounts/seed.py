import logging

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


def ensure_default_user():
    """Cria o usuário mockado (admin/admin por padrão) se ainda não existir.

    Idempotente: nunca sobrescreve a senha de um usuário já existente.
    Só age quando SEED_ADMIN=True.
    """
    if not settings.SEED_ADMIN:
        return None

    User = get_user_model()
    user, created = User.objects.get_or_create(username=settings.SEED_ADMIN_USERNAME)
    if created:
        user.set_password(settings.SEED_ADMIN_PASSWORD)
        user.save()
        logger.info("Usuário padrão '%s' criado (SEED_ADMIN=True).", user.username)
    if not settings.DEBUG:
        logger.warning("SEED_ADMIN está ativo com DEBUG=False — desative em produção.")
    return user
