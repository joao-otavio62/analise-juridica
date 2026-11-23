# Análise Jurídica com IA

Envie documentos de processos (`.txt`, `.pdf`, `.docx`, `.xlsx`), receba um resumo estruturado
(partes, fatos, riscos/prazos) e converse com a IA (Google Gemini) sobre o caso.

```
backend/    Django + DRF + JWT + drf-spectacular (Swagger em /api/docs)
frontend/   React + TypeScript + Tailwind v4 + Radix UI Dialog
```

## Rodando localmente

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# edite .env.local e cole sua GEMINI_API_KEY (https://aistudio.google.com/apikey)
python manage.py migrate        # cria o banco e o usuário admin/admin (SEED_ADMIN=True)
python manage.py runserver      # http://localhost:8000  ·  Swagger: /api/docs
python manage.py test           # testes (IA mockada, não gasta tokens)
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173  (login: admin / admin)
```

## Ambientes
`DJANGO_ENV=local|dev|prod` escolhe `backend/.env.<ambiente>` (padrão: `local`).
Veja `backend/.env.example`. Os arquivos `.env*` estão no `.gitignore`; `.env.local/.dev/.prod`
aqui contêm apenas **placeholders** — troque `SECRET_KEY` e nunca versione chaves reais.
Em produção use `DATABASE_URL=postgres://…`, `SEED_ADMIN=False` e `DOCS_PUBLIC=False`.

## API
| Rota | Descrição |
|---|---|
| `POST /api/auth/login` · `/register` · `/refresh` · `/logout` | Públicas (JWT). Todo o resto exige `Authorization: Bearer <token>` |
| `GET /api/analyses?q=&date=&page=` | Histórico com busca |
| `POST /api/analyses` (multipart `file`) | Extrai texto, gera resumo com IA e salva |
| `GET/DELETE /api/analyses/{id}` | Detalhe (resumo + chat) / exclusão |
| `POST /api/analyses/{id}/chat` `{message}` | Pergunta sobre o caso |

## Controle de custos e segurança
- Limite de upload: `MAX_UPLOAD_MB` (100) e `MAX_TEXT_CHARS` (100.000 — o texto é truncado e o usuário é avisado).
- `max_output_tokens`: 1500 (resumo) e 800 (chat). Chat envia só as últimas 6 mensagens (`CHAT_HISTORY_LIMIT`).
- Throttling por usuário: 5 uploads/h, 30 mensagens/h (`THROTTLE_UPLOAD`, `THROTTLE_CHAT`); 30/min por IP em rotas de auth.
- O texto extraído fica no banco; o chat nunca reenvia o arquivo. Cada usuário só acessa as próprias análises.
- Texto do documento é tratado como dado (mitigação básica contra prompt injection no system prompt).
- A IA falha → nada é salvo (o upload não consome espaço nem fica "pela metade").

## Limitações conhecidas
- PDFs escaneados (imagem) não têm OCR: retornam erro claro.
- `.doc`/`.xls` antigos não são suportados (salvar como `.docx`/`.xlsx`).
- Os modelos de IA mudam com frequência: ajuste `GEMINI_MODEL` conforme a [lista oficial](https://ai.google.dev/gemini-api/docs/models).
- Os limites de rate usam o cache padrão do Django (memória local). Com vários workers em produção, configure um cache compartilhado (Redis).
