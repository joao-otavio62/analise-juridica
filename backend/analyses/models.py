import uuid
from pathlib import Path

from django.conf import settings
from django.db import models


def upload_path(instance, filename):
    # Nome aleatório: evita colisões e path traversal; o nome original fica no banco.
    ext = Path(filename).suffix.lower()
    return f"uploads/{instance.user_id}/{uuid.uuid4().hex}{ext}"


class Analysis(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="analyses"
    )
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=upload_path)
    file_type = models.CharField(max_length=10)
    file_size = models.PositiveBigIntegerField(default=0)

    # Texto bruto extraído: alimenta o chat sem reenviar o arquivo.
    extracted_text = models.TextField()
    char_count = models.PositiveIntegerField(default=0)
    text_truncated = models.BooleanField(default=False)

    # Resumo estruturado (JSON) + versão em texto corrido para busca.
    summary = models.JSONField(default=dict)
    summary_text = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "-created_at"])]
        verbose_name_plural = "analyses"

    def __str__(self):
        return f"{self.title} ({self.user_id})"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "Usuário"
        ASSISTANT = "assistant", "Assistente"

    analysis = models.ForeignKey(Analysis, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
