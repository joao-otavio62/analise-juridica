from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Analysis, ChatMessage, Client, ClientDocument
from .serializers import (
    AnalysisDetailSerializer,
    AnalysisListSerializer,
    AnalysisUploadSerializer,
    ChatMessageSerializer,
    ChatRequestSerializer,
    ClientDocumentSerializer,
    ClientDocumentUploadSerializer,
    ClientSerializer,
)
from .services import ai, extraction
from .throttles import ChatRateThrottle, ClientListIntervalThrottle, UploadRateThrottle


@extend_schema(tags=["clientes"])
class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Client.objects.none()
        return Client.objects.filter(user=self.request.user).prefetch_related("documents")

    def get_throttles(self):
        if self.action == "list":
            return [ClientListIntervalThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        for document in instance.documents.all():
            document.file.delete(save=False)
        instance.delete()

    @extend_schema(
        summary="Lista todos os clientes do usuário (uma consulta a cada cinco segundos)",
        responses={200: ClientSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Lista ou anexa documentos ao cliente",
        request={"multipart/form-data": ClientDocumentUploadSerializer},
        responses={200: ClientDocumentSerializer(many=True), 201: ClientDocumentSerializer},
    )
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="documents",
        parser_classes=[MultiPartParser, FormParser],
    )
    def documents(self, request, pk=None):
        client = self.get_object()
        if request.method == "GET":
            return Response(ClientDocumentSerializer(client.documents.all(), many=True).data)

        serializer = ClientDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded = serializer.validated_data["file"]
        original_filename = Path(uploaded.name.replace("\\", "/")).name[:255]
        document = ClientDocument(
            client=client,
            original_filename=original_filename,
            file_size=uploaded.size,
        )
        document.file.save(original_filename, ContentFile(uploaded.read()), save=False)
        document.save()
        return Response(ClientDocumentSerializer(document).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Baixa um documento privado do cliente",
        parameters=[OpenApiParameter("document_id", int, location=OpenApiParameter.PATH)],
    )
    @action(
        detail=True,
        methods=["get"],
        url_path=r"documents/(?P<document_id>[^/.]+)/download",
    )
    def download_document(self, request, pk=None, document_id=None):
        client = self.get_object()
        document = get_object_or_404(client.documents, pk=document_id)
        return FileResponse(
            document.file.open("rb"),
            as_attachment=True,
            filename=document.original_filename,
        )

    @extend_schema(
        summary="Exclui um documento do cliente",
        parameters=[OpenApiParameter("document_id", int, location=OpenApiParameter.PATH)],
    )
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"documents/(?P<document_id>[^/.]+)",
    )
    def delete_document(self, request, pk=None, document_id=None):
        client = self.get_object()
        document = get_object_or_404(client.documents, pk=document_id)
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["análises"])
class AnalysisViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Cada usuário enxerga apenas as próprias análises."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # geração do schema OpenAPI
            return Analysis.objects.none()
        qs = Analysis.objects.filter(user=self.request.user)
        if self.action == "list":
            q = self.request.query_params.get("q", "").strip()
            if q:
                qs = qs.filter(
                    Q(title__icontains=q)
                    | Q(original_filename__icontains=q)
                    | Q(summary_text__icontains=q)
                )
            date = self.request.query_params.get("date", "").strip()  # YYYY-MM-DD
            if date:
                qs = qs.filter(created_at__date=date)
        if self.action == "retrieve":
            qs = qs.prefetch_related("messages")
        return qs

    def get_serializer_class(self):
        return {
            "list": AnalysisListSerializer,
            "create": AnalysisUploadSerializer,
            "chat": ChatRequestSerializer,
        }.get(self.action, AnalysisDetailSerializer)

    def get_throttles(self):
        if self.action == "create":
            return [UploadRateThrottle()]
        if self.action == "chat":
            return [ChatRateThrottle()]
        return super().get_throttles()

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="Busca em título, arquivo e resumo"),
            OpenApiParameter("date", str, description="Filtra por data (YYYY-MM-DD)"),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Envia um documento, extrai o texto e gera o resumo com IA",
        request={"multipart/form-data": AnalysisUploadSerializer},
        responses={201: AnalysisDetailSerializer},
    )
    def create(self, request, *args, **kwargs):
        ser = AnalysisUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        uploaded = ser.validated_data["file"]

        ext = extraction.validate_upload(uploaded)
        extracted = extraction.extract_text(uploaded, ext)

        # Chama a IA ANTES de gravar: se falhar, nada fica salvo no banco/disco.
        summary, summary_text = ai.summarize(extracted.text, uploaded.name)

        title = ser.validated_data.get("title") or uploaded.name.rsplit(".", 1)[0]
        analysis = Analysis(
            user=request.user,
            title=title[:255],
            original_filename=uploaded.name[:255],
            file_type=ext.lstrip("."),
            file_size=uploaded.size,
            extracted_text=extracted.text,
            char_count=len(extracted.text),
            text_truncated=extracted.truncated,
            summary=summary,
            summary_text=summary_text,
        )
        uploaded.seek(0)
        analysis.file.save(uploaded.name, ContentFile(uploaded.read()), save=False)
        analysis.save()
        return Response(AnalysisDetailSerializer(analysis).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.file.delete(save=False)  # remove também o arquivo do disco
        instance.delete()

    @extend_schema(
        summary="Pergunta sobre o caso (usa as últimas mensagens como contexto)",
        request=ChatRequestSerializer,
        responses={200: ChatMessageSerializer(many=True)},
    )
    @action(detail=True, methods=["post"], url_path="chat")
    def chat(self, request, pk=None):
        analysis = self.get_object()
        ser = ChatRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        question = ser.validated_data["message"]

        limit = settings.CHAT_HISTORY_LIMIT
        history = list(analysis.messages.order_by("-id")[:limit])[::-1]
        # Gemini exige que a conversa comece com "user".
        while history and history[0].role != ChatMessage.Role.USER:
            history.pop(0)

        answer = ai.chat_reply(analysis, history, question)

        user_msg = ChatMessage.objects.create(
            analysis=analysis, role=ChatMessage.Role.USER, content=question
        )
        bot_msg = ChatMessage.objects.create(
            analysis=analysis, role=ChatMessage.Role.ASSISTANT, content=answer
        )
        return Response(ChatMessageSerializer([user_msg, bot_msg], many=True).data)
