import io
import shutil
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from .exceptions import AIRateLimited
from .models import Analysis, Client, ClientDocument
from .services.ai import normalize_summary

User = get_user_model()
TMP_MEDIA = tempfile.mkdtemp()

FAKE_SUMMARY = (
    {
        "resumo_geral": "Ação de cobrança.",
        "partes_envolvidas": [{"nome": "João", "papel": "autor"}],
        "fatos_principais": ["Contrato firmado em 2024."],
        "riscos_prazos": [{"tipo": "prazo", "descricao": "Contestação", "prazo": "15 dias"}],
    },
    "Ação de cobrança.",
)


class SummaryNormalizationTests(SimpleTestCase):
    def test_normalize_summary_keeps_single_party_and_fact(self):
        summary = normalize_summary(
            {
                "resumo_geral": "Maria ajuizou ação contra a empresa por atraso na entrega.",
                "partes_envolvidas": {"nome": "Maria", "papel": "autora"},
                "fatos_principais": "A entrega ocorreu fora do prazo.",
            }
        )

        self.assertEqual(
            summary["partes_envolvidas"],
            [{"nome": "Maria", "papel": "autora"}],
        )
        self.assertEqual(
            summary["fatos_principais"],
            ["A entrega ocorreu fora do prazo."],
        )


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class ApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("ana", password="Senha-forte-123")
        self.other = User.objects.create_user("beto", password="Senha-forte-123")

    def login(self, user=None):
        self.client.force_authenticate(user or self.user)

    def upload(self, name="peticao.txt", content=b"Texto do processo."):
        return self.client.post(
            "/api/analyses",
            {"file": SimpleUploadedFile(name, content)},
            format="multipart",
        )

    # ---------------------------------------------------------- auth
    def test_routes_require_auth(self):
        self.assertEqual(self.client.get("/api/analyses").status_code, 401)

    def test_login_and_refresh(self):
        r = self.client.post("/api/auth/login", {"username": "ana", "password": "Senha-forte-123"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        r2 = self.client.post("/api/auth/refresh", {"refresh": r.data["refresh"]})
        self.assertEqual(r2.status_code, 200)

    def test_login_wrong_password(self):
        r = self.client.post("/api/auth/login", {"username": "ana", "password": "x"})
        self.assertEqual(r.status_code, 401)

    def test_register(self):
        r = self.client.post("/api/auth/register", {"username": "novo", "password": "Outra-senha-987"})
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("password", r.data)
        weak = self.client.post("/api/auth/register", {"username": "novo2", "password": "123"})
        self.assertEqual(weak.status_code, 400)

    @override_settings(SEED_ADMIN=True, SEED_ADMIN_USERNAME="admin", SEED_ADMIN_PASSWORD="admin")
    def test_seed_admin_can_login(self):
        from accounts.seed import ensure_default_user

        ensure_default_user()
        ensure_default_user()  # idempotente
        r = self.client.post("/api/auth/login", {"username": "admin", "password": "admin"})
        self.assertEqual(r.status_code, 200)

    def test_logout_blacklists_refresh(self):
        r = self.client.post("/api/auth/login", {"username": "ana", "password": "Senha-forte-123"})
        refresh = r.data["refresh"]
        self.assertEqual(self.client.post("/api/auth/logout", {"refresh": refresh}).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/refresh", {"refresh": refresh}).status_code, 401)

    # ---------------------------------------------------------- upload
    @mock.patch("analyses.services.ai.summarize", return_value=FAKE_SUMMARY)
    def test_upload_txt(self, _):
        self.login()
        r = self.upload()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["summary"]["partes_envolvidas"][0]["nome"], "João")
        a = Analysis.objects.get()
        self.assertEqual(a.extracted_text, "Texto do processo.")
        self.assertEqual(a.user, self.user)

    @mock.patch("analyses.services.ai.summarize", return_value=FAKE_SUMMARY)
    def test_upload_docx_xlsx_pdf(self, _):
        self.login()
        from docx import Document
        from openpyxl import Workbook
        from pypdf import PdfWriter

        d = Document()
        d.add_paragraph("Cláusula primeira")
        buf = io.BytesIO()
        d.save(buf)
        self.assertEqual(self.upload("c.docx", buf.getvalue()).status_code, 201)

        wb = Workbook()
        wb.active.append(["Parte", "Valor"])
        wb.active.append(["João", 100])
        buf = io.BytesIO()
        wb.save(buf)
        r = self.upload("p.xlsx", buf.getvalue())
        self.assertEqual(r.status_code, 201, r.data)

        # PDF sem texto (página em branco) -> erro claro
        w = PdfWriter()
        w.add_blank_page(200, 200)
        buf = io.BytesIO()
        w.write(buf)
        r = self.upload("vazio.pdf", buf.getvalue())
        self.assertEqual(r.status_code, 422)

    @mock.patch("analyses.services.ai.summarize")
    def test_upload_errors(self, summarize):
        self.login()
        self.assertEqual(self.upload("x.exe", b"abc").status_code, 422)
        self.assertEqual(self.upload("x.doc", b"abc").status_code, 422)
        self.assertEqual(self.upload("vazio.txt", b"").status_code, 400)  # DRF rejeita vazio
        self.assertEqual(self.upload("quebrado.pdf", b"isto nao e pdf").status_code, 422)
        self.assertEqual(self.upload("quebrado.docx", b"isto nao e docx").status_code, 422)
        summarize.assert_not_called()
        self.assertEqual(Analysis.objects.count(), 0)

    @override_settings(MAX_UPLOAD_BYTES=10, MAX_UPLOAD_MB=0)
    @mock.patch("analyses.services.ai.summarize")
    def test_upload_too_large(self, summarize):
        self.login()
        self.assertEqual(self.upload(content=b"x" * 50).status_code, 422)
        summarize.assert_not_called()

    @override_settings(MAX_TEXT_CHARS=20)
    @mock.patch("analyses.services.ai.summarize", return_value=FAKE_SUMMARY)
    def test_text_truncated(self, _):
        self.login()
        r = self.upload(content=b"a" * 500)
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data["text_truncated"])
        self.assertLessEqual(Analysis.objects.get().char_count, 20)

    @mock.patch("analyses.services.ai.summarize", side_effect=AIRateLimited())
    def test_ai_failure_saves_nothing(self, _):
        self.login()
        self.assertEqual(self.upload().status_code, 429)
        self.assertEqual(Analysis.objects.count(), 0)

    @mock.patch("analyses.services.ai.summarize", return_value=FAKE_SUMMARY)
    def test_upload_throttle(self, _):
        self.login()
        for _i in range(5):
            self.assertEqual(self.upload().status_code, 201)
        self.assertEqual(self.upload().status_code, 429)

    # ---------------------------------------------------------- chat
    @mock.patch("analyses.services.ai.chat_reply", return_value="Resposta da IA")
    def test_chat_history_limit_and_isolation(self, chat):
        self.login()
        a = Analysis.objects.create(
            user=self.user, title="t", original_filename="t.txt", extracted_text="x",
            summary={"resumo_geral": "r"}, summary_text="r",
        )
        for i in range(5):
            r = self.client.post(f"/api/analyses/{a.id}/chat", {"message": f"pergunta {i}"})
            self.assertEqual(r.status_code, 200)
            self.assertEqual([m["role"] for m in r.data], ["user", "assistant"])
        history = chat.call_args.args[1]
        self.assertEqual(len(history), 6)  # só as últimas 6
        self.assertEqual(history[0].role, "user")

        # outro usuário não acessa
        self.login(self.other)
        self.assertEqual(self.client.get(f"/api/analyses/{a.id}").status_code, 404)
        self.assertEqual(
            self.client.post(f"/api/analyses/{a.id}/chat", {"message": "oi"}).status_code, 404
        )

    @mock.patch("analyses.services.ai.chat_reply", return_value="ok")
    def test_chat_throttle_and_validation(self, _):
        self.login()
        a = Analysis.objects.create(user=self.user, title="t", original_filename="t.txt",
                                    extracted_text="x", summary={}, summary_text="")
        self.assertEqual(self.client.post(f"/api/analyses/{a.id}/chat", {"message": ""}).status_code, 400)
        # A requisição inválida acima também conta na cota (30/hora): restam 29.
        for _i in range(29):
            self.assertEqual(self.client.post(f"/api/analyses/{a.id}/chat", {"message": "oi"}).status_code, 200)
        self.assertEqual(self.client.post(f"/api/analyses/{a.id}/chat", {"message": "oi"}).status_code, 429)

    # ---------------------------------------------------------- histórico
    def test_list_search_detail_delete(self):
        self.login()
        a = Analysis.objects.create(user=self.user, title="Caso Silva", original_filename="s.txt",
                                    extracted_text="x", summary={"resumo_geral": "Despejo"},
                                    summary_text="Despejo")
        Analysis.objects.create(user=self.other, title="Caso Silva", original_filename="s.txt",
                                extracted_text="x", summary={}, summary_text="")
        r = self.client.get("/api/analyses")
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(self.client.get("/api/analyses?q=despejo").data["count"], 1)
        self.assertEqual(self.client.get("/api/analyses?q=inexistente").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/analyses/{a.id}").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/analyses/{a.id}").status_code, 204)
        self.assertEqual(Analysis.objects.filter(user=self.user).count(), 0)

    # ---------------------------------------------------------- clientes
    def test_clients_are_persisted_and_isolated_by_user(self):
        self.login()
        payload = {
            "full_name": "  João da Silva  ",
            "cpf": "123.456.789-00",
            "email": "joao@example.com",
            "process_number": "0001234-56.2025.8.26.0001",
            "court": "1ª Vara Cível",
            "process_notes": "Aguardar audiência.",
        }
        created = self.client.post("/api/clients", payload, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        client_id = created.data["id"]
        self.assertEqual(created.data["full_name"], "João da Silva")
        self.assertEqual(created.data["process_number"], payload["process_number"])
        self.assertEqual(Client.objects.get(pk=client_id).user, self.user)

        self.assertEqual(self.client.get("/api/clients").data[0]["id"], client_id)
        self.assertEqual(self.client.patch(
            f"/api/clients/{client_id}", {"phone": "(11) 99999-9999"}, format="json"
        ).status_code, 200)

        self.login(self.other)
        self.assertEqual(self.client.get("/api/clients").data, [])
        self.assertEqual(self.client.get(f"/api/clients/{client_id}").status_code, 404)
        self.assertEqual(
            self.client.patch(
                f"/api/clients/{client_id}", {"full_name": "Alterado"}, format="json"
            ).status_code,
            404,
        )

    def test_client_documents_are_private_and_persisted(self):
        self.login()
        client = Client.objects.create(user=self.user, full_name="Maria")
        uploaded = SimpleUploadedFile("contrato.pdf", b"documento privado", content_type="application/pdf")
        response = self.client.post(
            f"/api/clients/{client.id}/documents", {"file": uploaded}, format="multipart"
        )
        self.assertEqual(response.status_code, 201, response.data)
        document = ClientDocument.objects.get(client=client)
        self.assertTrue(document.file.storage.exists(document.file.name))

        downloaded = self.client.get(
            f"/api/clients/{client.id}/documents/{document.id}/download"
        )
        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(b"".join(downloaded.streaming_content), b"documento privado")

        self.login(self.other)
        self.assertEqual(
            self.client.get(f"/api/clients/{client.id}/documents").status_code, 404
        )
        self.assertEqual(
            self.client.get(
                f"/api/clients/{client.id}/documents/{document.id}/download"
            ).status_code,
            404,
        )
        self.login()
        self.assertEqual(
            self.client.delete(f"/api/clients/{client.id}/documents/{document.id}").status_code,
            204,
        )
        self.assertFalse(document.file.storage.exists(document.file.name))

    def test_client_list_requires_five_seconds_between_requests(self):
        self.login()
        self.assertEqual(self.client.get("/api/clients").status_code, 200)
        self.assertEqual(self.client.get("/api/clients").status_code, 429)

    # ---------------------------------------------------------- docs
    def test_swagger(self):
        self.assertEqual(self.client.get("/api/docs").status_code, 200)
        self.assertEqual(self.client.get("/api/schema").status_code, 200)
