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
  `{ "action": "lead.status_changed:new->contacted", "leadId": "lead_0002", "at": "2026-10-05T09:47:22.715Z" }`.
- Додатково перевірено вручну (у файли не зберігалось):
  - `leadId=lead_9999` → `isError: true`, «Лід lead_9999 не знайдено. Знайдіть правильний id через leaddesk_find_leads…»;
  - `leadId=lead_0002 status=new` (той самий статус) → `isError: true`, «…уже має статус new — нічого не змінено»;
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
  under scope…») — і без `teamId`, і з ним. `list_teams` для цього OAuth-токена повертає порожній список: під час
  входу токен не отримав доступу до команди, якій належить проєкт. Лог — див. `docs/mcp/evidence/vercel-build-log.txt`.
- **Playwright:** ланцюжок `browser_navigate` → `browser_snapshot` → `browser_fill_form` → `browser_click` →
  `browser_snapshot` → `browser_console_messages` → `browser_network_requests` ×2. Форма відправилась
  («Дякуємо! Заявку отримано…»), у консолі 0 помилок, після відправки — один `POST /` → 200, зовнішніх запитів
  немає. Деталі — `docs/mcp/evidence/playwright-form-check.md`.
- Що агент зробив сам, без прохання: у сесії Vercel агент **сам викликав `list_teams` і `list_projects`**
  (опис параметра `teamId` прямо підказує це зробити). `list_projects` відхилено (не в allow), `list_teams`
  повернув порожній список; їхні результати ніде не записані. Агент також запропонував обійти 403 через
  `vercel inspect --logs` (CLI) — не виконано: CLI тут не встановлено, і це обхід звуження MCP.
