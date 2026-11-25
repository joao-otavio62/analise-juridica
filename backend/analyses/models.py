import uuid
from pathlib import Path

from django.conf import settings
from django.db import models


def upload_path(instance, filename):
    # Nome aleatório: evita colisões e path traversal; o nome original fica no banco.
    ext = Path(filename).suffix.lower()
    return f"uploads/{instance.user_id}/{uuid.uuid4().hex}{ext}"


def client_document_upload_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"client-documents/{instance.client.user_id}/{uuid.uuid4().hex}{ext}"


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


class Client(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="clients"
    )
    full_name = models.CharField(max_length=255)
    cpf = models.CharField(max_length=14, blank=True)
    rg = models.CharField(max_length=30, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    profession = models.CharField(max_length=120, blank=True)
    marital_status = models.CharField(max_length=60, blank=True)
    zip_code = models.CharField(max_length=12, blank=True)
    street = models.CharField(max_length=255, blank=True)
    address_number = models.CharField(max_length=30, blank=True)
    complement = models.CharField(max_length=120, blank=True)
    neighborhood = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=2, blank=True)
    personal_notes = models.TextField(blank=True)
    process_number = models.CharField(max_length=40, blank=True)
    court = models.CharField(max_length=255, blank=True)
    case_type = models.CharField(max_length=120, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    opposing_party = models.CharField(max_length=255, blank=True)
    process_status = models.CharField(max_length=120, blank=True)
    process_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name", "id"]
        indexes = [models.Index(fields=["user", "full_name"])]

    def __str__(self):
        return f"{self.full_name} ({self.user_id})"


class ClientDocument(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="documents")
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=client_document_upload_path)
    file_size = models.PositiveBigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at", "-id"]


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
