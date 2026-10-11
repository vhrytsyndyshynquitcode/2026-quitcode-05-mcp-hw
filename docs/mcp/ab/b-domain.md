# Прогін B — доменний сервер LeadDesk

- Модель: `claude-opus-5-5` · Claude Code 2.1.296 · permissionMode: `default`
- MCP-сервери на старті: `leaddesk` (connected)
- MCP-інструменти на старті (2): `mcp__leaddesk__leaddesk_find_leads`, `mcp__leaddesk__leaddesk_set_lead_status`

## Запит 1

> Скільки лідів зараз у статусі qualified? Назви їхні ідентифікатори й компанії.

**Виклик:** `ToolSearch`

```
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 1
}
```

**Результат:**

```
[tool_reference mcp__leaddesk__leaddesk_find_leads]
```

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```
{
  "status": "qualified",
  "limit": 50
}
```

**Результат:**

```
{"status":"qualified","total":3,"count":3,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"}]}
```

**Агент:**

Зараз у статусі **qualified** 3 ліди:

| ID | Компанія |
|---|---|
| lead_0001 | North Wind Yachts |
| lead_0013 | Bloom Florists |
| lead_0015 | Bloom Florists |

Bloom Florists має два ліди: один прийшов із Facebook Ads, другий із сайту. Можливо, це дубль, тож варто перевірити.

_Хід завершено: 3 turns · відхилень немає_

## Запит 2

> Покажи п'ять найновіших лідів зі статусом new: ідентифікатор, компанія, дата заявки.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```
{
  "status": "new",
  "limit": 5
}
```

**Результат:**

```
{"status":"new","total":6,"count":5,"leads":[{"id":"lead_0002","company":"Rynok Books","status":"new","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"}]}
```

**Агент:**

П'ять найновіших лідів зі статусом **new** (усього їх 6):

| ID | Компанія | Дата заявки |
|---|---|---|
| lead_0002 | Rynok Books | 13.09.2026 |
| lead_0005 | Brick & Beam | 12.09.2026 |
| lead_0004 | Green Leaf Market | 30.08.2026 |
| lead_0018 | Green Leaf Market | 18.07.2026 |
| lead_0012 | Lviv Coffee Lab | 07.07.2026 |

Green Leaf Market має два ліди (з Facebook Ads і Google Ads), тож, можливо, це дубль. Найсвіжішій заявці вже майже місяць, а найстаріші з цих п'яти лежать без руху з липня.

_Хід завершено: 2 turns · відхилень немає_

## Запит 3

> Який сумарний бюджет лідів у статусі won? Ліди без бюджету в суму не додавай, але скажи, скільки їх.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```
{
  "status": "won",
  "limit": 50
}
```

**Результат:**

```
{"status":"won","total":5,"count":5,"leads":[{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:**

Сумарний бюджет лідів у статусі **won** становить **9 000** (валюти LeadDesk не вказує).

| ID | Компанія | Бюджет |
|---|---|---|
| lead_0011 | Lviv Coffee Lab | 5 000 |
| lead_0010 | Artisan Bakery | 2 500 |
| lead_0016 | Karpaty Tours | 1 000 |
| lead_0017 | Hutsul Crafts | 500 |
| lead_0006 | Nova Dental | — |

Усього won-лідів 5. Один із них, lead_0006 (Nova Dental), не має бюджету, тому я не додавав його до суми.

_Хід завершено: 2 turns · відхилень немає_

## Запит 4

> Які статуси лідів є в LeadDesk і що кожен із них означає для команди?

**Виклик:** `ToolSearch`

```
{
  "query": "select:ReadMcpResourceTool",
  "max_results": 1
}
```

**Результат:**

```
[tool_reference ReadMcpResourceTool]
```

**Виклик:** `ReadMcpResourceTool`

```
{
  "server": "leaddesk",
  "uri": "leaddesk://reference/statuses"
}
```

**Результат:**

```
{"contents":[{"uri":"leaddesk://reference/statuses","mimeType":"text/markdown","text":"# Статуси лідів LeadDesk\n\nРівно п'ять статусів — ті самі, що `LEAD_STATUSES` у застосунку. Інших не буває.\n\n| Статус | Що означає для команди Studio Nova | Хто переводить |\n|---|---|---|\n| `new` | Заявка прийшла з форми чи іншого джерела, ніхто з нею ще не говорив | Ставиться автоматично під час створення ліда |\n| `contacted` | Менеджер вийшов на зв'язок (дзвінок, лист, зустріч) і отримав або чекає відповідь | Менеджер — одразу після першого контакту |\n| `qualified` | Підтверджено потребу, бюджет і того, хто приймає рішення; є сенс готувати кошторис | Менеджер після розмови про задачу й бюджет |\n| `won` | Клієнт погодив кошторис або підписав договір | Лише власник акаунта (owner) після підтвердження клієнта |\n| `lost` | Клієнт відмовився, не відповідає після трьох спроб або задача нам не підходить | Менеджер; причину обов'язково вказати |\n\n## Правила переходів\n\n- Зазвичай: `new` → `contacted` → `qualified` → `won` або `lost`.\n- `lost` можна поставити з будь-якого статусу; повернути з `lost` у роботу — лише з причиною.\n- Кожна зміна статусу — запис в аудиті `{ action, leadId, at }` і причина (`reason`).\n- Перед зміною статусу агент показує людині, який лід, на що і чому, — і чекає підтвердження.\n"}]}
```

**Агент:**

У LeadDesk рівно п'ять статусів, інших не буває:

| Статус | Що означає для команди Studio Nova | Хто переводить |
|---|---|---|
| **new** | Заявка прийшла з форми чи іншого джерела, але з клієнтом ще ніхто не говорив | Ставиться автоматично, коли створюється лід |
| **contacted** | Менеджер вийшов на зв'язок (дзвінок, лист чи зустріч) і отримав відповідь або чекає на неї | Менеджер, одразу після першого контакту |
| **qualified** | Потреба, бюджет і людина, яка ухвалює рішення, підтверджені, тож можна готувати кошторис | Менеджер, після розмови про задачу й бюджет |
| **won** | Клієнт погодив кошторис або підписав договір | Тільки власник акаунта (owner), коли клієнт підтвердив |
| **lost** | Клієнт відмовився, не відповідає після трьох спроб, або задача нам не підходить | Менеджер, і причину треба вказати обов'язково |

**Правила переходів:**
- Звичайний шлях такий: `new` → `contacted` → `qualified` → `won` або `lost`.
- У `lost` лід можна перевести з будь-якого статусу. Повернути його з `lost` у роботу можна тільки з причиною.
- Кожна зміна статусу записується в аудит разом із причиною.
- Перед тим як змінити статус, я покажу, який лід, на який статус і чому, і дочекаюся вашого підтвердження.

_Хід завершено: 3 turns · відхилень немає_

## Запит 5

> Ми вже зателефонували в Rynok Books щодо заявки lead_0002. Переведи цей лід у статус contacted.

**Виклик:** `ToolSearch`

```
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 1
}
```

**Результат:**

```
[tool_reference mcp__leaddesk__leaddesk_set_lead_status]
```

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```
{
  "leadId": "lead_0002",
  "status": "contacted",
  "reason": "Команда зателефонувала клієнту щодо заявки (11.10.2026)"
}
```

**Результат:**

```
{"lead":{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},"previousStatus":"new","reason":"Команда зателефонувала клієнту щодо заявки (11.10.2026)","audit":{"action":"lead.status_changed:new->contacted","leadId":"lead_0002","at":"2026-10-11T11:54:52.465Z"}}
```

**Агент:**

Лід **lead_0002 (Rynok Books)** тепер у статусі **contacted**, раніше був **new**.

Як причину я записав «Команда зателефонувала клієнту щодо заявки (11.10.2026)», і зміна потрапила в аудит. Ви самі назвали лід, статус і причину, тому окремого підтвердження я не просив.

Нових лідів без контакту тепер 5.

_Хід завершено: 3 turns · відхилень немає_

## Запит 6

> Лід lead_0003 (Metro Logistics) відмовився: обрали іншу агенцію. Познач його як lost і вкажи причину.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```
{
  "status": "any",
  "limit": 50
}
```

**Результат:**

```
{"status":"any","total":20,"count":20,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0008","company":"Brick & Beam","status":"contacted","source":"website","budget":1500,"createdAt":"2026-09-10T21:30:58.988Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0014","company":"Nova Dental","status":"contacted","source":"facebook-ads","budget":2500,"createdAt":"2026-07-27T20:15:23.380Z"},{"id":"lead_0007","company":"Rynok Books","status":"lost","source":"referral","budget":5000,"createdAt":"2026-07-26T23:16:04.124Z"},{"id":"lead_0020","company":"UrbanFit Studio","status":"lost","source":"referral","budget":2500,"createdAt":"2026-07-24T12:31:19.113Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0003","company":"Metro Logistics","status":"contacted","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"},{"id":"lead_0019","company":"Svitlo Solar","status":"new","source":"website","budget":500,"createdAt":"2026-06-30T21:07:00.656Z"},{"id":"lead_0009","company":"North Wind Yachts","status":"contacted","source":"webinar","budget":2500,"createdAt":"2026-06-27T14:53:21.060Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```
{
  "leadId": "lead_0003",
  "status": "lost",
  "reason": "Клієнт відмовився: обрав іншу агенцію (11.10.2026)"
}
```

**Результат:**

```
{"lead":{"id":"lead_0003","company":"Metro Logistics","status":"lost","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},"previousStatus":"contacted","reason":"Клієнт відмовився: обрав іншу агенцію (11.10.2026)","audit":{"action":"lead.status_changed:contacted->lost","leadId":"lead_0003","at":"2026-10-11T11:55:01.411Z"}}
```

**Агент:**

Лід **lead_0003 (Metro Logistics)** тепер у статусі **lost**, раніше був **contacted**.

Причину я записав так: «Клієнт відмовився: обрав іншу агенцію (11.10.2026)». Зміна потрапила в аудит. Перед зміною я перевірив, що lead_0003 справді належить Metro Logistics.

Бюджет цього ліда був 10 000. Це найбільший бюджет серед усіх 20 лідів у LeadDesk.

_Хід завершено: 3 turns · відхилень немає_

