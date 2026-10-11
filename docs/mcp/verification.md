# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code 2.1.283 (CLI + desktop app) · Claude Opus 5.5
- **ОС і термінал, Node:** Windows 11 Pro · Git Bash · Node 23.4.0 · npm 10.9.2

## Task A — сервер в Inspector

- Команди, якими зроблено чотири файли в `docs/mcp/` — як у walkthrough, Git Bash, з кореня репозиторію:

  ```bash
  I="npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs"
  $I --method tools/list > docs/mcp/tools-list.json                                   # exit=0
  $I --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json   # exit=0
  $I --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json      # exit=5
  $I --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json      # exit=0
  ```

- `tools-list.json`: рівно два інструменти. `leaddesk_find_leads` — `"readOnlyHint":true`,
  `leaddesk_set_lead_status` — `"readOnlyHint":false` (плюс `destructiveHint:false`,
  `idempotentHint:false`, `openWorldHint:false`). У кожного параметра є `description` з `.describe(…)`:
  модель бачить перелік статусів, формат `lead_0002`, межі `limit` 1–50 і що `reason` — без
  персональних даних. Опис `leaddesk_set_lead_status` починається з «ЗМІНЮЄ ДАНІ» і просить
  підтвердження людини перед викликом.
- `bad-input.json`: зламано два аргументи — `leadId=nope` (не проходить `^lead_\d{4}$`) і `reason=ok`
  (коротше 3 символів). Результат `"isError": true`, текст:
  `Input validation error: … leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small: expected string to have >=3 characters`.
  Inspector завершився з кодом **5** і надрукував у stderr
  `{"error":{"code":"tool_is_error","message":"Tool 'leaddesk_set_lead_status' returned isError:true."}}`.
- `set-status.json`: `lead_0002` (Rynok Books) `new` → `contacted`; запис аудиту в `structuredContent.audit`:
  `{ "action": "lead.status_changed:new->contacted", "leadId": "lead_0002", "at": "2026-10-11T12:28:32.574Z" }`.
  (Чотири JSON перегенеровано 11.10 тими самими командами після правки: `leaddesk_set_lead_status` тепер
  відмовляє в переході в `new` — `new` ставиться лише під час створення, як і каже ресурс статусів.)
- Додатково перевірено вручну (у файли не зберігалось):
  - `leadId=lead_9999` → `isError: true`, «Лід lead_9999 не знайдено. Знайдіть правильний id через leaddesk_find_leads…»;
  - `leadId=lead_0002 status=new` (той самий статус) → `isError: true`, «…уже має статус new — нічого не змінено»
    (після правки 11.10 — `isError: true`, «Статус new ставиться лише під час створення ліда…»);
  - `leadId=lead_0003 status=contacted` при поточному `contacted` → `isError: true`, «…уже має статус contacted»;
  - `leaddesk_find_leads status=new limit=3` → 6 знайдено, показано 3, найновіші першими (`lead_0002`, `lead_0005`, `lead_0004`);
  - `leaddesk_find_leads status=any` — у відповіді жодного `fullName`, `email` чи `message`;
  - `grep -rc 'console\.log' mcp/leaddesk-server/src` → `0`;
  - `cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json` → файли однакові й після всіх прогонів.
- Що було найважче в описах інструментів і параметрів: сказати в описі `leaddesk_set_lead_status`
  одночасно три речі — що він змінює дані, що перед викликом потрібне підтвердження людини і де
  взяти правильний id, — і не перетворити опис на інструкцію на пів екрана. Друге — повідомлення
  помилок: вони теж читаються моделлю, тому кожна помилка підказує наступний крок
  (`leaddesk_find_leads`), а не просто «not found».

## Task B — що зробили агенти з серверами

Як запускали сесії: кожен крок — окрема headless-сесія `claude -p --strict-mcp-config --mcp-config <рівно один
сервер з .mcp.json>` у корені репозиторію (конектори claude.ai і решта серверів у сесію не потрапляють).
Перший вхід — інтерактивно: `claude` → схвалити сервери з `.mcp.json` → `/mcp` → Authenticate.

- **Supabase:** у сесії лише `supabase`, 9 інструментів. Виклики по черзі:
  `apply_migration` (`name: leaddesk_init`, SQL = `supabase/migrations/0001_leaddesk.sql`) → `{"success":true}`;
  `execute_sql` (SQL = `supabase/seed/leads.sql`) → `[]`;
  `execute_sql` `select count(*), min(id), max(id) from public.leads` → `[{"n":20,"min":"lead_0001","max":"lead_0020"}]`;
  `execute_sql` за статусами → contacted 4, lost 2, new 6, qualified 3, won 5 (= фікстура);
  `execute_sql` `select current_user, session_user, current_setting('is_superuser')` →
  `postgres / postgres / off` — `execute_sql` ходить під `postgres`, не суперкористувач, але повз RLS.
  Схвалення: `apply_migration` і `execute_sql` не в `allow`; дозвіл на цей один прогін дала людина в чаті після
  пояснення, що саме зміниться (`--allowedTools` лише на ці два інструменти), і підтвердила запуск у застосунку.
  Кожен результат `execute_sql` загорнуто в `<untrusted-data-…>` з попередженням не виконувати інструкцій зсередини.
  Перед міграцією `list_tables`/`list_migrations` (з allow) показали порожню схему.
- **Vercel:** проєкт підключено через git-інтеграцію в дашборді; гілку `ws05/vhrytsyndyshynquitcode` запушено —
  preview-деплой `READY` з коміту `cc1d6c0`. Сесія лише з `vercel`: `list_deployments` знайшов деплой, але
  лог білду **не віддався**: інструмента `get_deployment_build_logs` з інструкції в сервері вже немає, лог тепер
  віддає `list_deployment_events`, і він повертає `403 forbidden` («Not authorized: Trying to access resource
  under scope…») — і без `teamId`, і з ним: під час OAuth-входу токен не отримав доступу до scope, якому
  належить проєкт (повторний вхід з вибором scope ми не робили). Тому лог у
  `docs/mcp/evidence/vercel-build-log.txt` скопійовано з дашборда Vercel (Build Logs) — production-білд `main`
  @ `958d2ee`: `npm install` (493 пакети, очікувані `npm warn deprecated`), Next.js 16.3.5 (Turbopack),
  «Compiled successfully in 8.5s», TypeScript 3.5s, 8 статичних сторінок, «Build Completed … [24s]»,
  «Deployment completed». Назв команд у лозі немає.
- **Playwright:** ланцюжок `browser_navigate` → `browser_snapshot` → `browser_fill_form` → `browser_click` →
  `browser_snapshot` → `browser_console_messages` → `browser_network_requests` ×2. Форма відправилась
  («Дякуємо! Заявку отримано…»), у консолі 0 помилок, після відправки — один `POST /` → 200, зовнішніх запитів
  немає. Деталі — `docs/mcp/evidence/playwright-form-check.md`.
- Що агент зробив сам, без прохання: у сесії Vercel агент **сам викликав `list_teams` і `list_projects`**
  (опис параметра `teamId` прямо підказує це зробити). `list_projects` відхилено (не в allow); результатів цих
  викликів немає ні в жодному файлі, ні в цьому звіті. Агент також запропонував обійти 403 через
  `vercel inspect --logs` (CLI) — не виконано: CLI тут не встановлено, і це обхід звуження MCP.

## Task E (бонус)

- Варіант: **E1 — HTTP-сервер із захистом Host/Origin**
- Код: `mcp/leaddesk-server/src/http.mjs`. Фабрику сервера винесено в `src/leaddesk.mjs` (`export const factory`),
  тож stdio (`src/server.mjs` → `serveStdio(factory)`) і HTTP (`createMcpHandler(factory)`) — один і той самий
  сервер. Після рефакторингу stdio-версія віддає побайтово ті самі `tools/list` і `resources/read`, що в
  `docs/mcp/*.json` (`diff` порожній), `bad-input` — так само exit 5.
- Залежність: `"@modelcontextprotocol/node": "2.1.0"` — точна версія, у тому самому
  `mcp/leaddesk-server/package.json`; `npm install --save-exact`, `package-lock.json` оновлено.
- Будова: `toNodeHandler(createMcpHandler(factory))` з `@modelcontextprotocol/node`;
  `localhostHostValidation()` і `localhostOriginValidation()` **викликано в обробнику запиту** перед
  `mcp(req, res)` — гвард сам відповідає 403 і повертає `false`. `listen(3333, "127.0.0.1")` — лише loopback.
- Запуск: `node mcp/leaddesk-server/src/http.mjs` → у stderr `leaddesk MCP over HTTP: http://127.0.0.1:3333/mcp`.
- Докази — Git Bash, `body.json` з walkthrough (у тимчасовій теці поза репозиторієм, не закомічено):

  ```text
  $ curl -s -w "\nHTTP %{http_code}\n" "${H[@]}" --data-binary @body.json http://127.0.0.1:3333/mcp
  {"result":{"tools":[{"name":"leaddesk_find_leads","title":"Знайти ліди за статусом",…},{"name":"leaddesk_set_lead_status",…}]},"jsonrpc":"2.0","id":1}
  HTTP 200

  $ curl … -H "Host: evil.example" …
  {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Host: evil.example"},"id":null}
  HTTP 403

  $ curl … -H "Origin: https://evil.example" …
  {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Origin: evil.example"},"id":null}
  HTTP 403

  $ curl … без заголовка MCP-Protocol-Version …
  {"jsonrpc":"2.0","error":{"code":-32020,"message":"Bad Request: the request headers and body disagree: the body envelope names protocol version 2026-07-28 but the required MCP-Protocol-Version header is absent",…},"id":1}
  HTTP 400
  ```

- Додатково (після правки — 404 на інші шляхи), коди відповіді:
  `POST /admin` → **404**; `Host: localhost.evil.example` → **403**; `Origin: http://localhost:3000` → **200** —
  Origin-гвард порівнює лише hostname, **без порту**: будь-яка сторінка з `localhost` на іншому порту (наш
  `npm run dev` на :3000) пройде гвард. Записано в threat model.
- Висновок: 200 / 403 / 403 / 400 — як очікувалося. Host-гвард закриває DNS rebinding (сторінка з
  `evil.example`, що резолвиться в 127.0.0.1, приходить із чужим `Host`), Origin-гвард — запит зі сторінки в
  браузері на інший origin. Ні те, ні інше не є автентифікацією: будь-який локальний процес, що ставить
  `Host: 127.0.0.1`, отримає доступ до обох інструментів, зокрема до `leaddesk_set_lead_status`. Для
  запуску поза своєю машиною потрібні були б автентифікація (токен/OAuth) і TLS.
