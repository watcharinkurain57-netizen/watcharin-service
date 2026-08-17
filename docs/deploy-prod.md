# ขึ้น production ครั้งแรก

> PR: https://github.com/watcharinkurain57-netizen/watcharin-service/pull/16
> ลำดับสำคัญ — ข้อ 5 (merge) ต้องอยู่หลังข้อ 1–4 ไม่งั้นเว็บ prod จะชี้ไปฐานข้อมูลที่ยังไม่มีตาราง

## 0. เช็คก่อน — ช่องโปรเจกต์ฟรีเหลือไหม

Supabase จำกัด **2 free project ที่ active ต่อบัญชี** (นับรวมทุก org)
ตอนนี้ `Watcharin-Service-Dev` ใช้ไป 1 ช่อง

เช็คที่ https://supabase.com/dashboard — ถ้าเหลือช่องก็ทำต่อได้เลย
ถ้าเต็ม ต้องลบหรือ pause ของเก่าก่อน

**ทางเลือกถ้าไม่อยากเปลืองช่อง:** ใช้ตัว dev เป็น prod ไปเลย
เร็วกว่าและประหยัดกว่า แต่แลกกับการไม่มีที่ทดลอง migration
ครั้งหน้าที่แก้ฐานข้อมูลจะต้องรันใส่ข้อมูลจริงตรง ๆ — ไม่แนะนำถ้ามีลูกค้าจริงแล้ว

## 1. สร้าง Supabase project สำหรับ prod

Dashboard → New project

| ช่อง | ค่า |
|---|---|
| Name | `watcharin-service-prod` |
| Region | Southeast Asia (Singapore) — ใกล้ผู้ใช้ไทยที่สุด |
| Plan | Free |

จดไว้: **Project URL** และ **publishable key** (Settings → API Keys)

## 2. รัน migration ทั้งหมด

SQL Editor → วางไฟล์ `supabase/prod_deploy_0001_0008.sql` ทั้งไฟล์ → Run

รวม migration 0001–0008 เรียงลำดับไว้แล้ว **ห้ามสลับลำดับ** เพราะ
0005 อ่านค่าจากคอลัมน์ `status` ที่ 0002 สร้างก่อนจะลบทิ้ง
และ 0007 แก้ foreign key ที่ 0001 กับ 0006 สร้างไว้

ตรวจว่าลง: ควรได้ 4 โปรเจกต์
```sql
select slug, name, status from public.projects order by slug;
```

> ⚠️ ไฟล์รวมนี้หยุดที่ **0008** ตามชื่อไฟล์ — migration ที่มาทีหลัง (0009 เป็นต้นไป)
> ต้องรันทีละไฟล์จาก `supabase/migrations/` เอง **ทั้ง dev และ prod**
> อย่าลืมข้างใดข้างหนึ่ง ไม่งั้นจะเจออาการ "dev ใช้ได้ prod พัง" ที่ไล่หายาก

## 3. ตั้ง Google OAuth ให้ project ใหม่

**project ใหม่ = callback URL ใหม่** ต้องเพิ่มใน Google Cloud ไม่งั้นล็อกอินไม่ได้

Google Cloud → https://console.cloud.google.com/apis/credentials → OAuth client เดิม

เพิ่มใน **Authorized redirect URIs** (ของเดิมเก็บไว้ ใช้กับ dev ต่อ)
```
https://<prod-ref>.supabase.co/auth/v1/callback
```

เพิ่มใน **Authorized JavaScript origins**
```
https://watcharin-service.com
```

จากนั้นที่ Supabase **prod** → Authentication → Providers → Google
เปิด แล้ววาง Client ID + Secret ชุดเดิม

Authentication → URL Configuration
| ช่อง | ค่า |
|---|---|
| Site URL | `https://watcharin-service.com` |
| Redirect URLs | `https://watcharin-service.com/**` |

## 4. ตั้ง env บน Vercel

Project Settings → Environment Variables → เลือก **Production** อย่างเดียว
(อย่าใส่ทับ Preview เพราะอยากให้ Preview ยังชี้ไป dev)

```
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`RESEND_API_KEY` กับ `RESEND_FROM` ที่มีอยู่เดิมไม่ต้องแตะ

## 5. Merge PR

merge #16 เข้า main → Vercel สร้าง Production build

## 6. ⚠️ ตรวจว่า Vercel สร้าง Production build จริง

**อย่าเชื่อว่า merge = deploy** เคยเจอมาแล้วตอน tang-tee ที่ merge เข้า main
แล้ว Preview สร้างปกติ แต่ Production ค้างอยู่ที่ commit เก่ากว่า 2 ตัว
โดยไม่มีอะไรฟ้องเลย prod เลยรันโค้ดเก่าอยู่หลายวัน

```bash
gh api "repos/watcharinkurain57-netizen/watcharin-service/deployments?per_page=3" --jq '.[] | "\(.sha[0:7]) \(.created_at) \(.environment)"'
```

เทียบกับ
```bash
git log origin/main -1 --oneline
```

sha ต้องตรงกัน ถ้าไม่ตรง → `git commit --allow-empty -m "chore: trigger production build"` แล้ว push
หรือกด Redeploy ใน Vercel dashboard

## 7. ล็อกอินบนเว็บจริง แล้วตั้งสิทธิ์

เปิด https://watcharin-service.com/login → เข้าด้วย Google

**ต้องทำขั้นนี้ก่อน** เพราะตอนรัน migration ยังไม่มีใครใน `auth.users`
ส่วนที่ตั้งแอดมินจึงข้ามไป

จากนั้น SQL Editor (prod) → วาง `supabase/prod_post_login.sql` → Run
ควรได้ `เป็นแอดมิน = true` และเป็นเจ้าของ 4 โปรเจกต์

> ⚠️ **เจอจริง 2026-08-17** — รันไฟล์นี้ก่อนล็อกอิน แล้วเข้าใจว่าสำเร็จ
> `insert ... select ... from auth.users` ตอนตารางว่างใส่ 0 แถวโดยไม่ error
> SQL editor ขึ้นเขียวเหมือนเดิม แต่ไม่ได้เกิดอะไรขึ้นเลย
> อาการที่ตามมา: ล็อกอินได้ เห็นอีเมลตัวเองมุมขวาบน แต่ `＋ เพิ่มโปรเจกต์`
> กับ `โปรเจกต์ของฉัน` ไม่โผล่ และ `/projects/new` ฟ้องว่ายังไม่ได้เป็นแอดมิน
>
> **แก้: ล็อกอินให้เสร็จก่อน แล้วรันไฟล์เดิมซ้ำ** — ไฟล์นี้รันซ้ำได้ไม่เสียหาย
> ตอนนี้มีด่านกันไว้แล้ว ถ้ายังไม่มีใครล็อกอินมันจะ raise exception แทนที่จะเงียบ

## 8. ไล่ตรวจของจริง

- [ ] `/` หน้าแรกขึ้น โปรเจกต์ 3 กล่องมาจาก DB
- [ ] `/projects` แถวเลื่อนได้ ลูกศรโผล่ตอน hover
- [ ] `/projects/coresync` เห็นแท็บครบ 5 (ต้องล็อกอิน)
- [ ] แท็บงาน — บอร์ดลากได้ ปฏิทินขึ้นถูกวัน
- [ ] `＋ เพิ่มโปรเจกต์` โผล่ที่แถบบน
- [ ] สร้างลิงก์เชิญ แล้วเปิดในหน้าต่างไม่ระบุตัวตน เห็นชื่อโปรเจกต์
- [ ] **เปิด `/projects/coresync` ในหน้าต่างไม่ระบุตัวตน — ต้องไม่เห็นแท็บเงินหรือตัวเลขใด ๆ**

ข้อสุดท้ายสำคัญที่สุด เป็นการยืนยันว่า RLS บน prod ทำงานเหมือน dev

## หลัง deploy — ของที่ยังค้าง

- `/studio` ยังมีลิงก์ไป `tang-tee.com` / `x-tier.pro` ที่ถูกตัด url ออกแล้ว
  แต่เนื้อหายังพูดถึงอยู่ ไม่พังอะไร
- ยังไม่มี: แท็บแชท/คอมเมนต์ · แก้งวดจ่ายจากหน้าเว็บ
- อัปโหลดไฟล์จริงผ่าน Storage ทำแล้วใน migration `0009_file_storage.sql` — ต้องรันไฟล์นั้นทั้ง dev และ prod
