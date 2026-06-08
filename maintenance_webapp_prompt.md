# MAINTENANCE PROGRESS REPORTING WEB APP â€” FULL SPECIFICATION PROMPT

## 1. PROJECT OVERVIEW

Build a full-stack web application for managing and reporting daily maintenance progress for an industrial plant turnaround project (BDTT â€” Báº£o DÆ°á»¡ng Tá»•ng Thá»ƒ). The system replaces a fully manual Excel + Zalo workflow where 50â€“100 field technicians report progress via text messages and handwritten notes.

Current source artifacts in this folder:
- `22082025_BÃ¡o cÃ¡o tiáº¿n Ä‘á»™ Tá»• TBÄLÄK (1).xlsx` is demo data from the previous manually maintained Excel workflow. Use it to understand the target import/export shape, not as permanent production data.
- The workbook's main import/export sheet is `DATA`, with 2,119 demo task rows after the header.
- Future task imports use only sheet `DATA` columns `A:M`: `Stt` through `NhÃ³m trÆ°á»Ÿng`.
- Future worker progress is not imported from old date/progress columns. The app collects progress from workers and later exports a completed `DATA` sheet with progress columns filled.
- `worker_mobile_mockup.html` is the visual reference for the first worker mobile screen.
- `maintenance_webapp_prompt.md` is the implementation plan and should stay aligned with the real workbook format.

Implementation principle:
- Preserve the Excel-first admin workflow during MVP. Admin imports the task master list from Excel columns `A:M`, workers update progress in the app, and admin exports a completed Excel report.
- Keep the first production scope narrow: worker daily progress, admin upload preview/import, admin dashboard, and Excel export.

---

## 2. ROLES & USERS

### Role: Worker (NhÃ¢n viÃªn hiá»‡n trÆ°á»ng)
- 50â€“100 field technicians working across plant sections
- Each worker has a pre-assigned list of tag names (equipment items) to complete
- Reports progress via mobile browser daily, with 12:00 noon as the reminder target
- Sees ONLY their own assigned tasks
- Can update % progress, add notes, attach optional photos

### Role: Admin (GiÃ¡m sÃ¡t / Supervisor)
- 1 primary admin (project supervisor)
- Full access to all workers' data
- Manages task assignments by uploading Excel files
- Views real-time dashboard and exports reports
- Sets task priority levels

---

## 3. AUTHENTICATION

- Do NOT use Google OAuth or Microsoft OAuth for workers.
- Admin pre-creates internal accounts for all resource people.
- Username is the email local-part before `@`, e.g. `thanhcm` from `thanhcm@pvcfc.com.vn`.
- Default first-login password is `123456`.
- Users must change password after the first successful login before using worker/admin screens.
- Production implementation should use Supabase Auth email/password accounts created from the PVCFC email list. The UI may accept username, then resolve username to email server-side before calling Supabase Auth.
- Row-Level Security (RLS): workers can only read/write their own progress records
- Admin role is stored in `profiles.role` (`admin` | `worker`), not hardcoded in source code.

---

## 4. TECH STACK (100% Free Tier)

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Hosting | Vercel (free tier) |
| Charts | Recharts |
| Excel export | SheetJS (client-side) |
| Excel import parsing | xlsx (SheetJS) |

Dependency rule:
- Do not add libraries beyond the stack above without confirmation.
- Pin exact package versions during project initialization. Avoid broad upgrades after deployment unless explicitly approved.

---

## 5. DATABASE SCHEMA

### Table: `profiles`
```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id)
email       text UNIQUE NOT NULL
username    text UNIQUE NOT NULL -- email local-part, e.g. "thanhcm"
employee_code text
full_name   text
resource_name text UNIQUE -- Excel value such as "AMLL_CÃ™ MINH THÃ€NH"; used for assignment matching
nhom        text        -- e.g. "DK-AMLL", "DK-VALVE"
nhom_truong text        -- team lead name
role        text DEFAULT 'worker' -- 'admin' | 'worker'
must_change_password boolean DEFAULT true
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
```

### Table: `import_batches`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
file_name     text NOT NULL
sheet_name    text DEFAULT 'DATA'
imported_by   uuid REFERENCES profiles(id)
imported_at   timestamptz DEFAULT now()
row_count     int
status        text DEFAULT 'draft' -- 'draft' | 'applied' | 'failed'
notes         text
```

### Table: `tasks`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
import_batch_id uuid REFERENCES import_batches(id)
stt           int              -- sequence number from Excel
wo            text             -- Work Order number
tagname       text NOT NULL    -- e.g. "41PT-1007", "29LT-1004"
task_name     text             -- description from Excel
nhom          text             -- group e.g. "DK-AMLL"
don_vi        text             -- unit e.g. "AMONIA", "UTILITY", "UREA"
section       text             -- section number e.g. "41000", "29000"
duration      text             -- e.g. "1.5 hrs", "10 hrs"
priority      int DEFAULT 2    -- 1=High, 2=Medium, 3=Low
start_date    date
finish_date   date
resource_name text             -- raw Excel Resource Names value
nhom_truong   text             -- raw Excel NhÃ³m trÆ°á»Ÿng value
assigned_to   uuid REFERENCES profiles(id)  -- worker's user id
is_cancelled  boolean DEFAULT false
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### Table: `progress`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE
user_id     uuid REFERENCES profiles(id)
report_date date NOT NULL             -- the working day this report belongs to
percent     int CHECK (percent IN (0, 25, 50, 75, 100))
note        text                      -- optional free-text note
photo_path  text                      -- optional Supabase Storage path; generate signed URLs for viewing
submitted_at timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
UNIQUE(task_id, user_id, report_date) -- one worker record per task per day
```

### Table: `daily_snapshots`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
snapshot_date date UNIQUE NOT NULL
total_tasks   int
completed     int
in_progress   int
not_started   int
overall_pct   numeric(5,2)
by_group      jsonb    -- { "DK-AMLL": {done:5, total:10}, ... }
by_unit       jsonb    -- { "AMONIA": {done:3, total:8}, ... }
by_worker     jsonb    -- { "AMLL_CÃ™ MINH THÃ€NH": {done:5, total:10}, ... }
captured_at   timestamptz
```

---

## 6. CORE BUSINESS RULES

### Daily reminder at 12:00
- Workers should be reminded to update progress before 12:00 noon each working day.
- 12:00 is only a reminder target, not a cutoff. Workers can still submit/update progress, notes, and photos after 12:00.
- A countdown/reminder banner shows how much time remains before the 12:00 reminder target.
- Use Asia/Saigon time for reminder and date calculations.

### Daily snapshot
- At or after the 12:00 reminder target, the system may generate a `daily_snapshots` record summarizing the current state for reporting.
- Snapshot generation must not prevent later worker edits.
- Later exports should use the latest progress data unless admin explicitly chooses a snapshot date/state.
- Snapshot calculations exclude `is_cancelled = true` tasks.

### Excel Upload (Admin)
- Admin uploads an `.xlsx` file to bulk-import/replace the task list
- Expected source sheet: `DATA`
- Import only columns `A:M`: `Stt | Task Name | WO | Tagname | NhÃ³m | ÄÆ¡n vá»‹ chá»§ quáº£n | Section | Duration | Priority | Start | Finish | Resource Names | NhÃ³m trÆ°á»Ÿng`
- Match columns by header name and validate that all required `A:M` columns exist.
- Ignore old manually-entered progress/export columns from demo workbooks during import. Do not import date columns, `Total`, `%Complete`, `CÃ²n láº¡i`, `Cancel`, or `Ghi chÃº` unless admin explicitly enables a legacy migration mode.
- Workbook date headers from the old demo file may be Excel serial numbers such as `45885`; these are useful for export-format reference only (`45885` = `2025-08-16`).
- `Resource Names` contains the worker key from Excel (for example `AMLL_CÃ™ MINH THÃ€NH`) and should match `profiles.resource_name`. `profiles.full_name` can be derived for display.
- Upload replaces ALL existing active tasks for the current project only after preview + confirmation. Keep an `import_batches` record for audit.
- If a row cannot be assigned to a known profile, keep the task with `assigned_to = null`, show it in the upload preview, and let admin fix the mapping.

### Worker Progress Data
- The app collects progress values, notes, timestamps, and optional photos directly from workers.
- Worker-entered progress becomes the source for future export columns after `M`.
- Supported progress values remain `0, 25, 50, 75, 100` for mobile simplicity.

---

## 7. WORKER INTERFACE (Mobile-first, primary use case)

### Screen: Login
- Google / Microsoft sign-in buttons
- Logo + project name

### Screen: My Tasks (main screen)
- **Top bar**: Worker name, group (nhom), current date
- **Countdown banner**: "X giá» Y phÃºt cÃ²n láº¡i trÆ°á»›c má»‘c nháº¯c 12:00" (green â†’ amber â†’ red as time runs out). After 12:00: "ÄÃ£ qua má»‘c nháº¯c 12:00 â€” váº«n cÃ³ thá»ƒ cáº­p nháº­t"
- **Summary row**: 3 pills showing counts â€” HoÃ n thÃ nh | Äang lÃ m | ChÆ°a lÃ m
- **Filter chips**: Táº¥t cáº£ | ChÆ°a lÃ m | Äang lÃ m | Xong | Æ¯u tiÃªn cao
- **Task cards** â€” each card shows:
  - Left colored border: Red = Priority 1, Amber = Priority 2, Gray = Priority 3, Green = completed
  - Tag name (monospace font, prominent)
  - Task name (shorter description)
  - Badges: Priority level, ÄÆ¡n vá»‹ (AMONIA/UTILITY/UREA etc.), duration, planned dates
  - Current % badge (color-coded: gray=0%, amber=25-50%, blue=75%, green=100%)
  - Progress bar (thin, color-coded)
  - **% selector buttons**: [0%] [25%] [50%] [75%] [100%] â€” large tap targets (min 44px height)
  - Note input field (placeholder: "Ghi chÃº váº¥n Ä‘á» phÃ¡t sinh...")
  - Camera icon button (triggers file input for photo upload to Supabase Storage)
- **Section groupings** within the list: "Æ¯u tiÃªn cao â€” hÃ´m nay" / "Äang thá»±c hiá»‡n" / "ChÆ°a thá»±c hiá»‡n"
- **Submit button**: "Gá»­i bÃ¡o cÃ¡o hÃ´m nay" â€” enabled when at least 1 task has been updated. Shows "ÄÃ£ gá»­i lÃºc HH:MM âœ“" after submission. Worker can re-submit before cutoff to update.
- After 12:00: All % buttons, note fields, and photo upload remain editable; show a reminder-only banner.

### Screen: Overview (tab 2)
- Worker's own completion statistics
- Simple bar chart: their progress over the past 7 days
- "So vá»›i hÃ´m qua" delta

### Screen: History (tab 3)
- List of past report dates
- Tap a date â†’ see their submitted data for that day (read-only)

### Bottom navigation: Viá»‡c cá»§a tÃ´i | Tá»•ng quan | Lá»‹ch sá»­ | TÃ i khoáº£n

---

## 8. ADMIN INTERFACE (Desktop-first, secondary use case)

### Dashboard Page (always live, auto-refreshes every 60s via Supabase Realtime)

**KPI cards row (top)**:
- Tá»•ng háº¡ng má»¥c: current active task count (2,119 in the first source workbook)
- HoÃ n thÃ nh hÃ´m nay: X (X%)
- Äang thá»±c hiá»‡n: X
- ChÆ°a bÃ¡o cÃ¡o: X (workers who haven't submitted yet today)
- Priority 1 chÆ°a xong: X (red highlight if > 0)
- QuÃ¡ háº¡n (finish_date < today, percent < 100): X

**Progress by Group chart** (horizontal bar chart, Recharts):
- Y-axis: group names (DK-AMLL, DK-VALVE, DK-PLC, etc.)
- X-axis: % completion 0â€“100%
- Color: green if â‰¥80%, amber if 50â€“79%, red if <50%

**Progress by Unit chart** (donut or bar, Recharts):
- Segments: AMONIA, UTILITY, UREA, DIEN, etc.

**Daily progress trend** (line chart, Recharts):
- X-axis: dates (from project start to today)
- Y-axis: overall % complete
- Shows the historical snapshot data

**Priority 1 tasks not completed** (table):
- Columns: Tagname | NhÃ³m | ÄÆ¡n vá»‹ | Assigned to | Current % | Planned finish | Days overdue
- Sorted by days overdue descending
- Red highlighting for overdue

**Worker status table** (today's submission status):
- Columns: Name | NhÃ³m | Tasks assigned | Tasks done | % | Submitted at | Status
- Status badge: ÄÃ£ gá»­i (green) | ChÆ°a gá»­i (red) | ChÆ°a cÃ³ dá»¯ liá»‡u

**All tasks table** (filterable, searchable):
- Columns: Tagname | NhÃ³m | ÄÆ¡n vá»‹ | Priority | Assigned to | % hÃ´m nay | Start | Finish | Ghi chÃº
- Filters: NhÃ³m, ÄÆ¡n vá»‹, Priority, Status (done/in-progress/not started/overdue)
- Search by tagname or task name

### Admin Controls:
- **Export Excel button**: Exports current state as `.xlsx` â€” all tasks with today's % and notes (uses SheetJS, client-side)
- **Upload Excel button**: Opens file picker â†’ parses â†’ shows preview â†’ confirm import
- **Set Priority**: Inline edit priority on any task row
- **Date selector**: View dashboard state for any past date (pulls from `daily_snapshots` + `progress` table)

---

## 9. REALTIME UPDATES

- Admin dashboard subscribes to Supabase Realtime on the `progress` table
- When any worker submits, the worker status table and KPI cards update without page refresh
- Show a subtle "Updated just now" indicator when data refreshes

---

## 10. PHOTO UPLOAD

- Worker taps camera icon on a task card
- Triggers `<input type="file" accept="image/*" capture="environment">` for mobile camera
- On select: compress image client-side (max 1MB, max 1280px wide) before upload
- Upload to Supabase Storage bucket `progress-photos/{report_date}/{task_id}/{user_id}.jpg`
- Store the storage path in `progress.photo_path`
- Use a private bucket and signed URLs for display. Do not expose internal plant photos through public URLs.
- Admin can click photo thumbnail in the tasks table to view full image

---

## 11. EXCEL EXPORT FORMAT

The exported `.xlsx` file should generate a completed `DATA` sheet from:
- Master task fields imported from columns `A:M`
- Worker progress collected through the app

The output should preserve the original workbook shape closely enough for supervisor review and downstream Excel/Pivot usage.

| Column | Source |
|---|---|
| A - Stt | tasks.stt |
| B - Task Name | tasks.task_name |
| C - WO | tasks.wo |
| D - Tagname | tasks.tagname |
| E - NhÃ³m | tasks.nhom |
| F - ÄÆ¡n vá»‹ chá»§ quáº£n | tasks.don_vi |
| G - Section | tasks.section |
| H - Duration | tasks.duration |
| I - Priority | tasks.priority |
| J - Start | tasks.start_date |
| K - Finish | tasks.finish_date |
| L - Resource Names | tasks.resource_name or profiles.resource_name |
| M - NhÃ³m trÆ°á»Ÿng | tasks.nhom_truong |
| T:AF - Progress/date columns | app-collected progress values by report date |
| Total | calculated from app progress |
| %Complete | latest or calculated completion ratio |
| CÃ²n láº¡i | `1 - %Complete`, preserving workbook format |
| Cancel | blank by default for MVP; use `1` only if admin later adds cancellation support |
| Ghi chÃº | latest progress.note |

Legacy label mapping:

| Column | Source |
|---|---|
| Stt | tasks.stt |
| Task Name | tasks.task_name |
| WO | tasks.wo |
| Tagname | tasks.tagname |
| NhÃ³m | tasks.nhom |
| ÄÆ¡n vá»‹ chá»§ quáº£n | tasks.don_vi |
| Section | tasks.section |
| Duration | tasks.duration |
| Priority | tasks.priority |
| Start | tasks.start_date |
| Finish | tasks.finish_date |
| Resource Names | tasks.resource_name or profiles.resource_name |
| NhÃ³m trÆ°á»Ÿng | tasks.nhom_truong |
| [Date columns: one per working day] | app-collected progress.percent for that date |
| %Complete | latest progress.percent / 100 |
| CÃ²n láº¡i | `1 - %Complete`, preserving workbook format |
| Cancel | blank by default for MVP; `1` if `tasks.is_cancelled = true` |
| Ghi chÃº | latest progress.note |

Export rules:
- Preserve imported task columns `A:M` exactly in meaning and order.
- Fill progress/reporting columns after `M` from app data, especially the workbook's `T:AF` report area.
- If exporting with Excel serial date headers, convert report dates back to workbook-compatible headers.
- Keep Vietnamese text in UTF-8; mojibake in UI or exported files is not acceptable.

---

## 12. DEPLOYMENT & ENVIRONMENT

### Supabase setup required:
1. Create project at supabase.com (free tier)
2. Enable Supabase email/password auth. Do not enable Google/Microsoft OAuth for workers.
3. Run the SQL schema above in the SQL editor
4. Enable RLS and add policies:
   - `progress`: workers can INSERT/UPDATE/SELECT only their own rows for their assigned tasks; admin can SELECT all
   - `tasks`: workers can SELECT only tasks assigned to themselves; admin can INSERT/UPDATE/DELETE/SELECT all
   - `profiles`: users can SELECT their own row; admin can SELECT all
   - `import_batches`: admin-only
5. Create storage bucket `progress-photos` (private read, authenticated write)
6. Deploy Edge Function for the 12:00 reminder snapshot cron job

### Vercel setup:
1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy (automatic on git push)

### `.env.local` template:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

---

## 13. FILE STRUCTURE

```
/app
  /auth/callback/route.ts       -- OAuth callback handler
  /login/page.tsx               -- Login screen
  /worker/page.tsx              -- Worker main screen (My Tasks)
  /worker/history/page.tsx      -- Worker history screen
  /admin/page.tsx               -- Admin dashboard
  /admin/tasks/page.tsx         -- Admin all tasks table
  /admin/upload/page.tsx        -- Excel upload page
  /admin/imports/page.tsx       -- Import batch history and mapping errors
  layout.tsx                    -- Root layout with Supabase session provider
/components
  /worker
    TaskCard.tsx                -- Individual task card with % buttons
    CountdownBanner.tsx         -- 12:00 reminder countdown
    SummaryPills.tsx            -- Done/In-progress/Todo counts
  /admin
    KpiCards.tsx                -- Top KPI metric cards
    GroupProgressChart.tsx      -- Horizontal bar by group
    WorkerStatusTable.tsx       -- Today's submission status per worker
    TasksTable.tsx              -- Full filterable tasks table
    DailyTrendChart.tsx         -- Historical line chart
  ExcelUploader.tsx             -- Drag-drop Excel import
  ExcelExporter.tsx             -- Export button
/lib
  supabase/
    client.ts                   -- Browser Supabase client
    server.ts                   -- Server Supabase client
  excel/
    parser.ts                   -- Parse uploaded Excel â†’ task objects
    exporter.ts                 -- Generate Excel from task + progress data
    workbookDates.ts            -- Excel serial date conversion helpers
  utils.ts                      -- Date helpers, % color mapping
/supabase
  /functions/daily-reminder-snapshot/index.ts -- Edge Function: capture reminder snapshot
  schema.sql                     -- Full DB schema
```

---

## 14. UX DETAILS & EDGE CASES

- **No internet on site**: Show offline banner; queue updates in localStorage; sync when reconnected
- Offline queue should sync after reconnect even if it happens after 12:00.
- **Worker with 0 tasks**: Show empty state "KhÃ´ng cÃ³ háº¡ng má»¥c nÃ o Ä‘Æ°á»£c giao hÃ´m nay"
- **Worker submits after 12:00**: Allow the update; optionally mark it as after the reminder target in future reporting.
- **Admin uploads wrong Excel format**: Show column mapping error with specific missing column names
- **Duplicate tagname in upload**: Show warning, allow override
- **Mobile camera not available**: Fall back to file picker
- **Photo > 1MB**: Auto-compress before upload, no user action needed

---

## 15. BUILD SEQUENCE (recommended order)

1. Next.js project init + Tailwind + basic routing
2. Local Excel parser for sheet `DATA` columns `A:M`; generate import preview from the existing demo workbook
3. Supabase schema draft in `/supabase/schema.sql` with RLS policies; do not apply to production without confirmation
4. Internal account seed + Supabase Auth email/password setup + force password change
5. Admin upload page: parse â†’ preview mapping issues â†’ confirm import
6. Worker My Tasks screen using tasks imported from `DATA` columns `A:M`
7. Worker progress submit/update before cutoff
8. 12:00 reminder snapshot without locking worker edits
9. Admin dashboard KPI cards + worker status table
10. Admin all tasks table with filters/search
11. Excel export generating a completed `DATA` sheet with app-collected progress in the report columns
12. Charts and realtime refresh
13. Photo upload with private bucket + signed URLs
14. Offline banner/local retry queue
15. PWA/mobile polish
16. Testing + deploy to Vercel after environment confirmation

---

## 16. SAMPLE DATA (for development/testing)

Workers to seed:
- cu.minh.thanh@pvcfc.com â€” DK-AMLL â€” assigned: 41PT-1007, 41PT-1005, 29PT-1004, 29PT-1002, 29LT-1004
- trinh.phuoc.tung@pvcfc.com â€” DK-AMLL â€” assigned: 29PXT-1012B, 29PXT-1012C, 29PXT-1001A
- vo.minh.hoang@pvcfc.com â€” DK-AMLL â€” assigned: 29LT-1004, 21LT-1104
- tran.khanh.hoa@pvcfc.com â€” DK-AMLL â€” assigned: 29PT-1023C, 29PT-1023A, 29FT-1001C

Admin:
- admin@pvcfc.com â€” role: admin

