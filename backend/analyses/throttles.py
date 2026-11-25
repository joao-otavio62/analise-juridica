from django.core.cache import cache
from rest_framework.throttling import BaseThrottle, UserRateThrottle


class ClientListIntervalThrottle(BaseThrottle):
    """Permite no máximo uma consulta à lista de clientes a cada cinco segundos."""

    interval = 5

    def allow_request(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        key = f"clients:list:{request.user.pk}"
        return cache.add(key, True, timeout=self.interval)

    def wait(self):
        return self.interval


class UploadRateThrottle(UserRateThrottle):
    """Ex.: 5 uploads/hora por usuário (THROTTLE_UPLOAD)."""

    scope = "upload"


class ChatRateThrottle(UserRateThrottle):
    """Ex.: 30 mensagens de chat/hora por usuário (THROTTLE_CHAT)."""

    scope = "chat"
