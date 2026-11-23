from rest_framework.throttling import UserRateThrottle


class UploadRateThrottle(UserRateThrottle):
    """Ex.: 5 uploads/hora por usuário (THROTTLE_UPLOAD)."""

    scope = "upload"


class ChatRateThrottle(UserRateThrottle):
    """Ex.: 30 mensagens de chat/hora por usuário (THROTTLE_CHAT)."""

    scope = "chat"
