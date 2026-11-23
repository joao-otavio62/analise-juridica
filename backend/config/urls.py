from django.conf import settings
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAdminUser

_docs_permission = [AllowAny] if settings.DOCS_PUBLIC else [IsAdminUser]

urlpatterns = [
    path("api/schema", SpectacularAPIView.as_view(permission_classes=_docs_permission), name="schema"),
    path(
        "api/docs",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=_docs_permission),
        name="swagger-ui",
    ),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("analyses.urls")),
]
