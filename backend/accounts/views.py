from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from .serializers import RegisterSerializer


class _AuthThrottleMixin:
    """Limita tentativas por IP nas rotas públicas (força bruta / spam de cadastro)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@extend_schema(tags=["auth"], summary="Login (JWT)")
class LoginView(_AuthThrottleMixin, TokenObtainPairView):
    permission_classes = [AllowAny]


@extend_schema(tags=["auth"], summary="Renova o access token")
class RefreshView(_AuthThrottleMixin, TokenRefreshView):
    permission_classes = [AllowAny]


@extend_schema(tags=["auth"], summary="Encerra a sessão (invalida o refresh token)")
class LogoutView(_AuthThrottleMixin, TokenBlacklistView):
    permission_classes = [AllowAny]


@extend_schema(tags=["auth"], summary="Cadastro de usuário")
class RegisterView(_AuthThrottleMixin, generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
