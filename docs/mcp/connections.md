# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті чи одноразові, без клієнтських організацій і команд): Supabase — особистий
  акаунт, окремий порожній проєкт лише для цієї домашки · Vercel — особистий акаунт (Hobby), проєкт
  з git-інтеграцією мого форку · Figma — не використовували
- **Третій сервер:** Playwright — чому саме він: не потребує акаунта й не має квоти викликів (у Figma
  на Starter — 20 на місяць), а перевірка форми заявки в браузері — ближча до реальної задачі
  «перевір, що фіча працює після деплою», ніж токени з макета.
- **Vercel CLI на цій машині:** не встановлено (`command -v vercel` — порожньо). Отже
  `use_vercel_cli` → `Bash` → `vercel …` тут нікуди не веде; якщо CLI колись встановлять, логін — лише
  в особистий акаунт.

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | Один проєкт: читати й писати таблиці (`execute_sql`, `apply_migration`), читати логи й адвайзори, URL і publishable-ключі проєкту, генерувати TS-типи, шукати в документації. Ходить з правами розробника, повз RLS | Міграція схеми `leads` і сид 20 лідів для Task C | Повне читання й зміна всіх даних **цього** проєкту, зокрема ПД лідів (ім'я, email, текст заявки); видалення таблиць. Інших проєктів і організацій акаунта токен через цей URL не бачить | `project_ref=oavfyhgroyqffxmcoeoe` — лише один проєкт, з інструментів зникає `project_id`; `features=database,development,docs` — немає `account` (create/pause/list проєктів і організацій), `functions` (канал назовні: deploy edge function), `branching` (платне). `read_only` свідомо не стоїть — потрібен `apply_migration`. `execute_sql` і `apply_migration` не в `allow`: кожен виклик схвалюю вручну |
| `vercel` | Увесь мій користувач Vercel: проєкти, деплої, логи білду й рантайму, домени, toolbar-коментарі, покупки | Знайти останній деплой і прочитати лог білду | Злодій токена може задеплоїти довільний код у production, роздати обхід Deployment Protection, купити домен/кредити з картки, писати в toolbar-треди, які бачить клієнт, читати логи рантайму | Звузити на сервері нічим (один OAuth-скоуп `openid`). На клієнті — `deny` на всі 11 інструментів, що змінюють стан або обходять захист (`buy_*` ×4, `deploy_to_vercel`, `get_access_to_vercel_url`, `import-claude-design-from-url`, 4 toolbar-інструменти); в `allow` лише `list_deployments`, `get_deployment`, `get_deployment_build_logs`. Vercel CLI не встановлено |
| `playwright` | Браузер Chrome на моїй машині: відкривати сторінки, клікати, вводити текст, читати DOM, консоль і мережу | Перевірити форму заявки на `http://localhost:3000` після змін | Отруєна сторінка (prompt injection у знімку) може змусити агента відкрити адресу з даними в query — канал виносу; без deny — виконати JS у процесі сервера (`browser_run_code_unsafe`, «RCE-equivalent») чи прочитати `.env.local` через `browser_file_upload` | Точна версія `@playwright/mcp@0.0.82` (без `@latest`); `--isolated` — профіль лише в пам'яті, без моїх логінів; `--no-webmcp` — сторінка не додає інструментів; `--allowed-origins http://localhost:3000` — лише зручність, не межа безпеки. `deny`: `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate`. `browser_network_request` (заголовки й тіло з `Cookie`) — ні в allow, ні в deny: щоразу питає |

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблиці: `leads` (CHECK на `id ~ '^lead_\d{4}$'`, статус — рівно `LEAD_STATUSES`, джерело — `LEAD_SOURCES`), індекс `(status, created_at desc)`, RLS увімкнено без політик
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, ті самі, що в `materials/leads.json` (згенеровано з файла 1:1)
- Скільки інструментів Supabase видно в `/mcp` із вашим URL: <N — після сесії>
- Якими викликами створено схему й дані і що ви схвалювали вручну: <після сесії>

## Сесії: що вмикаємо разом

У кожній сесії — щонайбільше один сервер із правом запису; браузерний сервер — ніколи разом із Supabase.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Вхід (OAuth) | `supabase`, `vercel` — лише Authenticate, агенту нічого не пишемо | — (жодного виклику) |
| Міграція й сид | `supabase` | `supabase` |
| Лог білду | `vercel` | —, записуючі інструменти під deny |
| Знімки «до/після» | `playwright` (headless `claude -p --strict-mcp-config --mcp-config <лише playwright>`) | — (нічого не викликали) |
| Перевірка форми в браузері | `playwright` | `playwright` (браузер); Supabase вимкнено |

## До і після звуження: третій сервер

- Як отримали перелік: нова headless-сесія, де піднято лише `playwright`
  (`claude -p --strict-mcp-config --mcp-config pw-only.json`), запит «Перелічи всі інструменти сервера
  playwright, які тобі зараз доступні. Нічого не викликай…» — до і після додавання deny у
  `.claude/settings.json`
- `docs/mcp/evidence/mcp-before.txt`: 25 інструментів
- `docs/mcp/evidence/mcp-after.txt`: 21 інструмент; зникли: `browser_run_code_unsafe`,
  `browser_file_upload`, `browser_drop`, `browser_evaluate` (`webmcp_*` не було й у «до» —
  `--no-webmcp`; правило лишається на випадок, якщо прапорець приберуть)
