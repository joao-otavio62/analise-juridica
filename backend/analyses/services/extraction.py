"""Validação de arquivos e extração de texto bruto (TXT, PDF, DOCX, XLSX)."""
import io
import zipfile
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings

from ..exceptions import ExtractionError

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".xlsx"}
LEGACY_HINTS = {
    ".doc": "Formato .doc antigo não é suportado. Salve o arquivo como .docx.",
    ".xls": "Formato .xls antigo não é suportado. Salve o arquivo como .xlsx.",
}


@dataclass
class ExtractedText:
    text: str
    truncated: bool


class _Collector:
    """Acumula texto e interrompe cedo ao passar do limite (evita ler 100MB à toa)."""

    def __init__(self, limit):
        self.limit = limit
        self.parts = []
        self.size = 0
        self.truncated = False

    @property
    def full(self):
        return self.size >= self.limit

    def add(self, chunk):
        chunk = (chunk or "").strip()
        if not chunk or self.full:
            return
        remaining = self.limit - self.size
        if len(chunk) > remaining:
            chunk = chunk[:remaining]
            self.truncated = True
        self.parts.append(chunk)
        self.size += len(chunk) + 1  # +1 do separador

    def result(self):
        return ExtractedText("\n".join(self.parts).strip(), self.truncated or self.full)


def validate_upload(uploaded):
    """Valida extensão e tamanho. Retorna a extensão (ex.: '.pdf')."""
    ext = Path(uploaded.name).suffix.lower()
    if ext in LEGACY_HINTS:
        raise ExtractionError(LEGACY_HINTS[ext])
    if ext not in ALLOWED_EXTENSIONS:
        raise ExtractionError(
            f"Extensão '{ext or 'desconhecida'}' não suportada. Use: "
            + ", ".join(sorted(ALLOWED_EXTENSIONS))
        )
    if uploaded.size == 0:
        raise ExtractionError("O arquivo está vazio.")
    if uploaded.size > settings.MAX_UPLOAD_BYTES:
        raise ExtractionError(f"Arquivo acima do limite de {settings.MAX_UPLOAD_MB}MB.")
    return ext


def extract_text(uploaded, ext):
    """Extrai o texto bruto. Levanta ExtractionError para arquivos inválidos."""
    limit = settings.MAX_TEXT_CHARS
    uploaded.seek(0)
    try:
        if ext == ".txt":
            result = _from_txt(uploaded, limit)
        elif ext == ".pdf":
            result = _from_pdf(uploaded, limit)
        elif ext == ".docx":
            result = _from_docx(uploaded, limit)
        else:
            result = _from_xlsx(uploaded, limit)
    except ExtractionError:
        raise
    except Exception as exc:  # arquivo corrompido / formato inesperado
        raise ExtractionError(
            f"O arquivo parece corrompido ou inválido ({type(exc).__name__})."
        ) from exc
    finally:
        uploaded.seek(0)

    if not result.text:
        raise ExtractionError(
            "Nenhum texto encontrado no arquivo (PDFs escaneados/imagens exigem OCR, "
            "que não é suportado)."
        )
    return result


def _from_txt(f, limit):
    raw = f.read(limit * 4 + 4)  # UTF-8 tem até 4 bytes/char
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:  # latin-1 nunca falha, por segurança
        text = raw.decode("utf-8", errors="replace")
    c = _Collector(limit)
    c.add(text)
    c.truncated = c.truncated or f.read(1) != b""
    return c.result()


def _from_pdf(f, limit):
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(f)
        if reader.is_encrypted:
            try:
                ok = reader.decrypt("")  # PDFs protegidos só por senha de edição
            except Exception:
                ok = 0
            if not ok:
                raise ExtractionError("O PDF está protegido por senha.")
        c = _Collector(limit)
        pages = reader.pages
        for i, page in enumerate(pages):
            if c.full:
                c.truncated = True
                break
            c.add(page.extract_text() or "")
        return c.result()
    except PdfReadError as exc:
        raise ExtractionError("PDF corrompido ou inválido.") from exc


def _check_zip(f):
    try:
        with zipfile.ZipFile(f) as z:
            total = sum(i.file_size for i in z.infolist())
    except zipfile.BadZipFile as exc:
        raise ExtractionError("Arquivo corrompido ou não é um documento Office válido.") from exc
    # Proteção contra "zip bomb": descompactado muito acima do limite de upload.
    if total > settings.MAX_UPLOAD_BYTES * 5:
        raise ExtractionError("Conteúdo do arquivo descompactado é grande demais.")
    f.seek(0)


def _from_docx(f, limit):
    from docx import Document

    _check_zip(f)
    doc = Document(f)
    c = _Collector(limit)
    for p in doc.paragraphs:
        if c.full:
            break
        c.add(p.text)
    for table in doc.tables:
        for row in table.rows:
            if c.full:
                break
            c.add(" | ".join(cell.text.strip() for cell in row.cells))
    if c.full:
        c.truncated = True
    return c.result()


def _from_xlsx(f, limit):
    from openpyxl import load_workbook

    _check_zip(f)
    wb = load_workbook(f, read_only=True, data_only=True)
    c = _Collector(limit)
    try:
        for ws in wb.worksheets:
            if c.full:
                break
            c.add(f"## Planilha: {ws.title}")
            for row in ws.iter_rows(values_only=True):
                if c.full:
                    break
                cells = ["" if v is None else str(v) for v in row]
                if any(cells):
                    c.add(" | ".join(cells))
    finally:
        wb.close()
    if c.full:
        c.truncated = True
    return c.result()
