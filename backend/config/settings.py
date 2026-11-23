"""
Configuração do projeto.

O ambiente é escolhido por DJANGO_ENV (local | dev | prod) e as variáveis
são lidas de backend/.env.<DJANGO_ENV> (ex.: .env.local). Variáveis já
definidas no sistema têm prioridade sobre o arquivo.
"""
import os
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

DJANGO_ENV = os.environ.get("DJANGO_ENV", "local")

env = environ.Env()
_env_file = BASE_DIR / f".env.{DJANGO_ENV}"
if _env_file.exists():
    environ.Env.read_env(_env_file)

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --------------------------------------------------------------------------
# Apps / middleware
# --------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "accounts",
    "analyses",
]

# API 100% stateless (JWT): sem sessões, CSRF ou admin.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,  # necessário para o Swagger UI do drf-spectacular
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]

# --------------------------------------------------------------------------
# Banco de dados: SQLite (dev) / PostgreSQL (prod) via DATABASE_URL
# --------------------------------------------------------------------------
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Documentos enviados. Propositalmente SEM MEDIA_URL/rota pública: são
# documentos jurídicos e só devem ser lidos pelo backend.
MEDIA_ROOT = BASE_DIR / "media"

# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5173", "http://127.0.0.1:5173"]
)

# --------------------------------------------------------------------------
# DRF + JWT + Swagger
# --------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Tudo bloqueado por padrão; só login/register/refresh/logout liberam acesso.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "upload": env("THROTTLE_UPLOAD", default="5/hour"),
        "chat": env("THROTTLE_CHAT", default="30/hour"),
        "auth": env("THROTTLE_AUTH", default="30/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=1)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Análise Jurídica com IA — API",
    "DESCRIPTION": (
        "Envie documentos jurídicos (.txt, .pdf, .docx, .xlsx), receba um resumo "
        "estruturado e converse com a IA sobre o caso. Use /api/auth/login para "
        "obter o token e clique em Authorize."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,  # necessário para upload multipart
}

# Se False, o Swagger exige usuário staff (use False em produção).
DOCS_PUBLIC = env.bool("DOCS_PUBLIC", default=True)

# --------------------------------------------------------------------------
# Usuário padrão mockado (apenas dev/local — mantenha False em produção)
# --------------------------------------------------------------------------
SEED_ADMIN = env.bool("SEED_ADMIN", default=False)
SEED_ADMIN_USERNAME = env("SEED_ADMIN_USERNAME", default="admin")
SEED_ADMIN_PASSWORD = env("SEED_ADMIN_PASSWORD", default="admin")

# --------------------------------------------------------------------------
# IA (Gemini) e controle de custos
# --------------------------------------------------------------------------
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
GEMINI_MODEL = env("GEMINI_MODEL", default="gemini-3.5-flash-lite")
GEMINI_SUMMARY_MAX_TOKENS = env.int("GEMINI_SUMMARY_MAX_TOKENS", default=1500)
GEMINI_CHAT_MAX_TOKENS = env.int("GEMINI_CHAT_MAX_TOKENS", default=800)
# Opcional: orçamento de "thinking" (0 desliga em modelos que suportam).
GEMINI_THINKING_BUDGET = env.int("GEMINI_THINKING_BUDGET", default=None)

CHAT_HISTORY_LIMIT = env.int("CHAT_HISTORY_LIMIT", default=6)
CHAT_MAX_MESSAGE_CHARS = env.int("CHAT_MAX_MESSAGE_CHARS", default=2000)

MAX_UPLOAD_MB = env.int("MAX_UPLOAD_MB", default=100)
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_TEXT_CHARS = env.int("MAX_TEXT_CHARS", default=100_000)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}
