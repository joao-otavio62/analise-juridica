from rest_framework import status
from rest_framework.exceptions import APIException


class ExtractionError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Não foi possível extrair texto do arquivo."
    default_code = "extraction_failed"


class AIConfigError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "A IA não está configurada no servidor (GEMINI_API_KEY ausente)."
    default_code = "ai_not_configured"


class AIRateLimited(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "O serviço de IA atingiu o limite de uso. Tente novamente em instantes."
    default_code = "ai_rate_limited"


class AIServiceError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Falha ao consultar a IA. Tente novamente em instantes."
    default_code = "ai_error"
