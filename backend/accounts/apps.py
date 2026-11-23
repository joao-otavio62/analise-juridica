from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _seed_after_migrate(sender, **kwargs):
    # "accounts" não tem models, então o Django nunca emite post_migrate para ele.
    # Usamos o app "auth" (dono da tabela de usuários) como gatilho.
    if sender.label != "auth":
        return
    from .seed import ensure_default_user

    ensure_default_user()


class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        post_migrate.connect(_seed_after_migrate, dispatch_uid="accounts.seed_default_user")
