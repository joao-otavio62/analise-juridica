from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Analysis, ChatMessage


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
