# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code (desktop app, Code tab) · Claude Opus 5.5
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

- **Supabase:** <які інструменти викликав агент для міграції й сиду; що ви схвалили вручну; чи щось відхилили>
- **Vercel:** <як задеплоїли (git-інтеграція); яким інструментом отримали лог; що в ньому>
- **Figma:** <`whoami`: план і сіт; скільки викликів витратили з квоти; з якого фрейму токени>
- **Playwright:** <ланцюжок інструментів; чи відправилась форма; що в консолі й мережі>
- Що агент зробив сам, без прохання (наприклад, викликав інструмент, який ви не очікували): <… / нічого>
