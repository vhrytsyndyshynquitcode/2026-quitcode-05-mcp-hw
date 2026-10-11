# LeadDesk MCP server

Доменний stdio-сервер LeadDesk (Task A, WS5): два бізнес-дієслова замість SQL на всю базу.

| Ім'я | Що робить | Анотації |
|---|---|---|
| `leaddesk_find_leads` | ліди за статусом (`new`, `contacted`, `qualified`, `won`, `lost`, `any`), найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | `readOnlyHint: true` |
| `leaddesk_set_lead_status` | змінює статус одного ліда, повертає запис аудиту `{ action, leadId, at }` | `readOnlyHint: false` |
| `leaddesk://reference/statuses` | ресурс `text/markdown`: що означає кожен статус для команди | — |

Дані — `fixtures/leads.json` (незмінна копія `materials/leads.json`, 20 лідів). Сервер читає файл
один раз і тримає зміни лише в пам'яті процесу: після перезапуску дані знову ті самі, файл не
переписується.

## Запуск

```bash
cd mcp/leaddesk-server
npm ci
node src/server.mjs        # stdio: чекає JSON-RPC на stdin
```

HTTP-варіант (бонус E1) — той самий сервер, лише на `127.0.0.1`, з перевіркою `Host` і `Origin`
на кожен запит:

```bash
node src/http.mjs          # http://127.0.0.1:3333/mcp
```

Код поділено так: `src/leaddesk.mjs` — інструменти, ресурс і дані (`factory`); `src/server.mjs` — stdio;
`src/http.mjs` — Streamable HTTP.

Змінні оточення (необов'язкові):

| Змінна | Що робить |
|---|---|
| `LEADDESK_FIXTURE` | шлях до іншого JSON-файла з лідами; за замовчуванням `fixtures/leads.json` поруч із сервером |
| `LEADDESK_HTTP_PORT` | порт HTTP-варіанта; за замовчуванням `3333` |

## Перевірка Inspector'ом

Git Bash, з кореня репозиторію:

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=new --tool-arg limit=3
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Збережені виводи — у `docs/mcp/*.json`.

## Підключення до Claude Code

Скоуп `local` (лише ви, у git нічого), з теки, де працюватиме агент:

```bash
claude mcp add leaddesk -- node "<шлях до репозиторію>/mcp/leaddesk-server/src/server.mjs"
```

Кожен виклик `leaddesk_set_lead_status` схвалюйте вручну: в `allow` його не додаємо.
