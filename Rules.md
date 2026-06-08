# AGENT RULES — Maintenance Progress Web App
> Đọc và tuân thủ toàn bộ file này trước khi viết bất kỳ dòng code nào.

---

## 0. NGUYÊN TẮC CỐT LÕI

**Không bao giờ tự suy diễn hoặc đoán mò.**
Nếu một yêu cầu chưa rõ ràng, DỪNG lại và hỏi ngay trước khi code.
Một câu hỏi đúng lúc tốt hơn 200 dòng code sai hướng.

---

## 1. TRƯỚC KHI BẮT ĐẦU MỖI TASK

Trước khi viết code cho bất kỳ feature nào, phải trả lời đủ 4 câu này:

```
[ ] 1. Tôi đang build CÁI GÌ? (feature, component, API route...)
[ ] 2. Input là gì? Output là gì?
[ ] 3. Edge case nào có thể xảy ra?
[ ] 4. Có điểm nào chưa rõ trong spec không?
```

Nếu câu 4 = có → hỏi user NGAY. Không code tiếp.

---

## 2. KHI NÀO PHẢI HỎI USER

Bắt buộc hỏi lại khi gặp bất kỳ trường hợp nào sau:

### 2.1 Spec mơ hồ
- Requirement dùng từ như "khoảng", "có thể", "tùy", "tương tự", "linh hoạt"
- Một tính năng có thể hiểu theo 2+ cách khác nhau
- Không rõ behavior khi dữ liệu rỗng / null / edge case

### 2.2 Quyết định kỹ thuật ảnh hưởng lớn
- Thay đổi database schema (thêm/sửa/xóa bảng hoặc cột)
- Thay đổi cấu trúc file/thư mục so với spec
- Dùng thư viện khác với tech stack đã định
- Bất kỳ thứ gì không có trong `maintenance_webapp_prompt.md`

### 2.3 Conflict giữa các yêu cầu
- Spec Section A mâu thuẫn với Section B
- Logic business rule không nhất quán

### 2.4 Assumption về dữ liệu thực
- Tên cột Excel thực tế khác với spec
- Format dữ liệu (ngày tháng, số, text) không rõ

**Format hỏi chuẩn:**
```
⚠️ CẦN XÁC NHẬN trước khi tiếp tục:

Vấn đề: [mô tả ngắn gọn điều chưa rõ]
Option A: [hướng xử lý A] → hệ quả: [...]
Option B: [hướng xử lý B] → hệ quả: [...]

Bạn chọn hướng nào?
```

---

## 3. CODING STANDARDS

### 3.1 TypeScript
- Strict mode bật (`"strict": true` trong `tsconfig.json`)
- **Không dùng `any`** — nếu không biết type, dùng `unknown` và narrow down
- Mọi function phải có return type tường minh
- Interface cho mọi object shape quan trọng, đặt trong `/types/`

```typescript
// ❌ SAI
const getTask = async (id) => { ... }

// ✅ ĐÚNG
const getTask = async (id: string): Promise<Task | null> => { ... }
```

### 3.2 Error Handling
- **Không bao giờ** để lỗi bị nuốt im lặng (silent catch)
- Mọi `async/await` phải có try/catch với error logging
- Supabase calls phải check cả `data` và `error`

```typescript
// ❌ SAI
const { data } = await supabase.from('tasks').select()
return data

// ✅ ĐÚNG
const { data, error } = await supabase.from('tasks').select()
if (error) {
  console.error('[getTaskList]', error.message)
  throw new Error(`Failed to fetch tasks: ${error.message}`)
}
return data
```

### 3.3 Naming
| Loại | Convention | Ví dụ |
|---|---|---|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase + use prefix | `useTaskList.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `MAX_PHOTO_SIZE_MB` |
| DB columns | snake_case | `report_date`, `task_id` |
| TS types/interfaces | PascalCase | `Task`, `ProgressRecord` |
| CSS classes | kebab-case (nếu dùng CSS modules) | `task-card--priority-1` |

### 3.4 File tối đa 300 dòng
Nếu file vượt 300 dòng → tách thành module nhỏ hơn.
Không có component nào làm quá 1 việc.

### 3.5 Comments
- Comment giải thích **tại sao**, không phải **cái gì**
- Business logic phức tạp (ví dụ: logic lock 12:00) PHẢI có comment

```typescript
// Lock progress records at 12:00 noon — records submitted after this
// time are rejected. This is a hard business rule: the snapshot for
// the day is taken at cutoff and used for the daily report.
```

---

## 4. GIT DISCIPLINE

### Commit message format (Conventional Commits):
```
<type>(<scope>): <mô tả ngắn gọn bằng tiếng Anh>

type: feat | fix | chore | refactor | docs | test | style
scope: worker | admin | auth | db | excel | api | infra
```

Ví dụ:
```
feat(worker): add countdown banner with 12:00 lock logic
fix(admin): correct % calculation when all tasks cancelled
chore(db): add RLS policy for progress table
refactor(excel): extract column parser to separate util
```

### Quy tắc commit:
- **1 commit = 1 việc cụ thể** — không commit nhiều feature cùng lúc
- Không commit code chưa chạy được
- Không commit `.env`, `.env.local`, secret keys
- Mỗi feature branch: `feat/worker-task-card`, `feat/admin-dashboard`, `fix/lock-logic`

---

## 5. DATABASE & SUPABASE

### 5.1 RLS không được tắt
Row-Level Security phải bật trên TẤT CẢ các bảng.
Không dùng service role key ở client-side.

### 5.2 Migration thay vì sửa tay
Mọi thay đổi schema phải được viết thành file SQL trong `/supabase/migrations/`.
Không sửa trực tiếp trên Supabase dashboard mà không có file migration tương ứng.

```sql
-- /supabase/migrations/20250822_add_is_cancelled_to_tasks.sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;
```

### 5.3 Không raw query khi có Supabase client
```typescript
// ❌ SAI — dễ SQL injection, bypass RLS
const { data } = await supabase.rpc('raw_query', { sql: '...' })

// ✅ ĐÚNG
const { data, error } = await supabase
  .from('tasks')
  .select('*, profiles(full_name)')
  .eq('assigned_to', userId)
  .order('priority', { ascending: true })
```

### 5.4 Realtime subscription — phải cleanup
```typescript
useEffect(() => {
  const channel = supabase.channel('progress-updates').on(...)
  return () => { supabase.removeChannel(channel) }  // PHẢI có cleanup
}, [])
```

---

## 6. SECURITY

- **Không hardcode** URL, key, email whitelist trong source code — dùng env vars
- Admin email whitelist lưu trong DB (`profiles.role`), không hardcode trong code
- File upload: validate type (`image/*` only) và size (max 5MB) ở cả client VÀ Supabase Storage policy
- Không log dữ liệu nhạy cảm (email, token) vào console ở production

---

## 7. PERFORMANCE

- Mọi danh sách dài (tasks table) phải có **pagination** hoặc **virtual scroll** — không fetch all
- Image upload: compress về max 1280px, max 1MB **trước khi** upload lên Storage
- Chart data: tính toán aggregation ở server (Supabase query), không pull raw data về client rồi tính
- Dùng `React.memo` hoặc `useMemo` khi component re-render không cần thiết ở task list (50–100 items)

---

## 8. MOBILE-FIRST

Giao diện worker là **ưu tiên số 1**:
- Tap target tối thiểu **44×44px** (WCAG 2.1 AA) — đặc biệt các nút % (0/25/50/75/100)
- Test bằng Chrome DevTools mobile emulation (iPhone 14 Pro = 393px width)
- Không dùng hover-only interaction trên mobile
- Input `type="file"` cho camera: `accept="image/*" capture="environment"`
- Font size tối thiểu 12px — không nhỏ hơn

---

## 9. TESTING CHECKLIST (trước khi báo "done")

Trước khi nói feature đã hoàn thành, tự kiểm tra:

```
HAPPY PATH
[ ] Luồng chính hoạt động đúng với dữ liệu hợp lệ

EDGE CASES
[ ] Dữ liệu rỗng (0 tasks, 0 workers)
[ ] Worker chưa được gán task nào
[ ] Admin upload Excel sai format
[ ] Worker submit đúng lúc 11:59 (cho phép)
[ ] Worker submit lúc 12:01 (phải bị block)
[ ] Mất mạng giữa chừng khi submit
[ ] Photo > 5MB

AUTH
[ ] Worker không thể xem data của worker khác
[ ] Worker không thể truy cập route /admin/*
[ ] Token hết hạn → redirect về login

MOBILE
[ ] Giao diện worker đẹp trên màn hình 390px
[ ] Nút bấm đủ lớn trên màn hình cảm ứng
[ ] Không có horizontal scroll
```

---

## 10. WHAT NOT TO DO

```
❌ Tự thêm feature không có trong spec mà không hỏi
❌ Dùng thư viện ngoài tech stack đã định mà không confirm
❌ Sửa database schema mà không có migration file
❌ Commit .env hoặc bất kỳ secret nào
❌ Để any type trong TypeScript
❌ Silent catch (catch lỗi mà không xử lý hoặc log)
❌ Hardcode email, URL, config value trong code
❌ Build toàn bộ app trong 1 file
❌ Fetch toàn bộ bảng không có pagination khi list > 50 items
❌ Copy-paste code lặp lại > 3 lần mà không extract thành util/hook
```

---

## 11. KHI GẶP LỖI

1. **Đọc error message đầy đủ** — không đoán mò
2. **Reproduce được lỗi** trước khi fix
3. **Tìm root cause**, không chỉ fix symptom
4. Nếu fix > 30 phút không ra → báo user, mô tả rõ đã thử gì

---

## 12. DEFINITION OF DONE

Một task chỉ được coi là DONE khi:

```
[ ] Code chạy được, không có runtime error
[ ] Đã test các edge case trong Section 9
[ ] TypeScript không có lỗi (tsc --noEmit sạch)
[ ] Không có console.error bị bỏ qua
[ ] Commit message đúng format
[ ] Không có TODO/FIXME chưa giải quyết
[ ] Nếu có thay đổi schema → migration file đã viết
```

---

*Version 1.0 — Maintenance Report Web App — 2025*