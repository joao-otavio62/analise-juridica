from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Analysis, ChatMessage, Client, ClientDocument


class ClientDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientDocument
        fields = ("id", "original_filename", "file_size", "uploaded_at")
        read_only_fields = fields


class ClientSerializer(serializers.ModelSerializer):
    documents = ClientDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = (
            "id", "full_name", "cpf", "rg", "birth_date", "email", "phone",
            "profession", "marital_status", "zip_code", "street", "address_number",
            "complement", "neighborhood", "city", "state", "personal_notes",
            "process_number", "court", "case_type", "subject", "opposing_party",
            "process_status", "process_notes", "documents", "created_at", "updated_at",
        )
        read_only_fields = ("id", "documents", "created_at", "updated_at")

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Informe o nome do cliente.")
        return value


class ClientDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        from pathlib import Path

        from django.conf import settings

        allowed_extensions = {
            ".doc", ".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt", ".xls", ".xlsx",
        }
        extension = Path(value.name).suffix.lower()
        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Formato não suportado. Envie PDF, documento Office, TXT ou imagem."
            )
        if value.size == 0:
            raise serializers.ValidationError("O arquivo está vazio.")
        if value.size > settings.MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(
                f"Arquivo acima do limite de {settings.MAX_UPLOAD_MB}MB."
            )
        return value


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "created_at")
        read_only_fields = fields


class AnalysisListSerializer(serializers.ModelSerializer):
    """Item do histórico (sem o texto completo)."""

    preview = serializers.SerializerMethodField()

    class Meta:
        model = Analysis
        fields = (
            "id", "title", "original_filename", "file_type", "file_size",
            "char_count", "text_truncated", "preview", "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_preview(self, obj):
        return (obj.summary or {}).get("resumo_geral", "")[:240]


class AnalysisDetailSerializer(AnalysisListSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(AnalysisListSerializer.Meta):
        fields = AnalysisListSerializer.Meta.fields + ("summary", "messages")
        read_only_fields = fields


class AnalysisUploadSerializer(serializers.Serializer):
    file = serializers.FileField(write_only=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=settings.CHAT_MAX_MESSAGE_CHARS, trim_whitespace=True)
