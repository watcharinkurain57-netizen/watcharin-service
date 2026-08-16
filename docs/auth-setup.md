# ตั้งค่า Google Login

> โปรเจกต์ dev: `dubqdtsqpazfqopdjooc` (org Watcharin-Service-Dev, สิงคโปร์)

## 1. Google Cloud Console

**หน้าจอยินยอม** — https://console.cloud.google.com/auth/branding

- User type: **External**
- App name: `watcharin-service`
- Support email / Developer contact: อีเมลของเจ้าของ

**OAuth client** — https://console.cloud.google.com/apis/credentials
→ Create credentials → OAuth client ID → **Web application**

| ช่อง | ค่า |
|---|---|
| Name | `watcharin-service` |
| Authorized JavaScript origins | `http://localhost:3000` |
| | `https://watcharin-service.com` |
| Authorized redirect URIs | `https://dubqdtsqpazfqopdjooc.supabase.co/auth/v1/callback` |

> ⚠️ redirect URI ต้องชี้ไป **Supabase** ไม่ใช่เว็บเรา
> Google ยิงกลับไปที่ Supabase ก่อน แล้ว Supabase ค่อยส่งต่อมาที่ `/auth/callback` ของเรา
> ถ้าใส่โดเมนเราตรง ๆ จะเจอ `redirect_uri_mismatch`

## 2. Supabase

**เปิด provider** — https://supabase.com/dashboard/project/dubqdtsqpazfqopdjooc/auth/providers
Google → เปิด → วาง Client ID + Client Secret → Save

**URL ที่อนุญาต** — https://supabase.com/dashboard/project/dubqdtsqpazfqopdjooc/auth/url-configuration

| ช่อง | ค่า |
|---|---|
| Site URL | `http://localhost:3000` (prod เปลี่ยนเป็น `https://watcharin-service.com`) |
| Redirect URLs | `http://localhost:3000/**` |
| | `https://watcharin-service.com/**` |

## 3. ทดสอบ

1. `pnpm dev` แล้วเปิด http://localhost:3000/login
2. กดเข้าสู่ระบบด้วย Google
3. เด้งกลับมาที่หน้าเดิมพร้อมชื่อผู้ใช้ที่มุมขวาบน

## 4. ตั้งตัวเองเป็นเจ้าของโปรเจกต์ (ทำครั้งเดียวหลังล็อกอินครั้งแรก)

ล็อกอินครั้งแรกแล้วจะมีแถวใน `auth.users` เอาไปผูกเป็นเจ้าของทุกโปรเจกต์
รันใน SQL Editor แล้วแก้อีเมลให้ตรงกับที่ใช้ล็อกอิน

```sql
insert into public.project_members (project_id, user_id, role)
select p.id, u.id, 'owner'
from public.projects p
cross join auth.users u
where u.email = 'watcharinkurain57@gmail.com'
on conflict (project_id, user_id) do nothing;
```

เช็คว่าลงครบ:

```sql
select p.slug, m.role, u.email
from public.project_members m
join public.projects p on p.id = m.project_id
join auth.users u on u.id = m.user_id;
```

## หมายเหตุ

- ยังไม่ต้องใส่ค่าอะไรเพิ่มใน `.env.local` — Google client id/secret อยู่ฝั่ง Supabase
  ทั้งหมด เว็บเราคุยกับ Supabase อย่างเดียว
- ลูกค้าจะเข้ามาอยู่ในโปรเจกต์ผ่านลิงก์เชิญ (`project_invites`) ไม่ใช่สมัครแล้วรออนุมัติ
  — ส่วนนั้นยังไม่ได้ทำ
