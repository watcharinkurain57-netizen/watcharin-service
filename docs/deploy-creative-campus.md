# เผยแพร่ Creative Campus

เป้าหมาย: เปลี่ยนหน้าหลักเป็น Portfolio เก็บระบบงานเดิมไว้แต่ปิดการเข้าใช้ งานเผยแพร่อยู่ใน [PR #49](https://github.com/watcharinkurain57-netizen/watcharin-service/pull/49) ใช้ GitHub/Vercel project และโดเมน `watcharin-service.com` เดิม

## ค่าที่ใช้สำหรับ build

ใช้ Vercel project ของเว็บไซต์เดิม โดยตั้งค่าใน environment ที่จะเผยแพร่:

| ตัวแปร | ค่า / ความหมาย |
| --- | --- |
| `SITE_MODE` | `portfolio` |
| `INTERNAL_WORKSPACE_ENABLED` | `false` |
| `NEXT_PUBLIC_SITE_URL` | `https://watcharin-service.com` |
| `RESEND_API_KEY` | คีย์จริงฝั่ง server ของ Resend หากต้องการส่งผ่านแบบฟอร์ม |
| `RESEND_FROM` | อีเมลล้วนบนโดเมนที่ยืนยันกับ Resend แล้ว เช่น `hello@watcharin-service.com` |
| `CONTACT_TO_EMAIL` | กล่องรับคำขอ ค่าเริ่มต้น `watcharin@watcharin-service.com` |

ค่า Portfolio/workspace-off เป็นค่าเริ่มต้นอยู่แล้ว แต่ระบุให้ชัดใน Vercel เพื่อให้ตรวจและย้อนกลับได้ง่าย ไม่มีขั้นตอนสร้างฐานข้อมูลหรือรัน migration สำหรับการเปลี่ยนหน้า Portfolio นี้ เก็บค่าของระบบเดิมไว้ได้ ไม่ต้องลบ

ต้อง rebuild หลังเปลี่ยนตัวแปร: หน้า Contact เป็น static และเลือกแสดงแบบฟอร์มหรือช่องทางอีเมลระหว่าง build หากไม่มี API key หรืออีเมลผู้ส่งไม่ถูกต้อง หน้า Contact จะเปิดแอปอีเมลของผู้เข้าชมแทน การมีรูปแบบตัวแปรถูกต้องยังไม่ยืนยันว่าโดเมนหรือสิทธิ์ส่งใน Resend พร้อม

## ผลงานที่พร้อมตรวจ

- `/`: แคมปัส 3D พร้อมภาพสำรองและโหมดลด Motion
- `/campus/work`: ผลงานเจ็ดชิ้น รวมสถานะ Demo/Archived และภาพคอนเซปต์ที่ระบุไว้
- `/campus/zones/brands`: WANSABYE พร้อมภาพที่ได้รับอนุญาตและลิงก์ต้นทาง; Thai Thrae อยู่ระหว่างพัฒนา
- `/campus/work/brands`: ข้อมูลสองแบรนด์ตามสถานะจริง; เปิดภาพ WANSABYE ขนาดใหญ่ เลื่อนด้วยปุ่ม/ลูกศร ปิดด้วย Escape และคืนโฟกัสได้บน Desktop/มือถือ
- `/campus/zones/{systems,brands,media,web}`: ภาพกระบวนการ 3 ขั้นต่อโซน พร้อมคำอธิบายแนวทางทำงาน; `/campus/projects/watcharin` มีภาพขั้นตอนพัฒนา Creative Campus
- `/campus/contact?zone=brands`: เลือกหัวข้อ Brand House ล่วงหน้า เปลี่ยนประเภทงานได้
- `/campus/resume/th` และ `/campus/resume/en`: Resume สำหรับพิมพ์
- `/projects` และ `/start`: redirect ไปผลงาน/ติดต่อ; ระบบงานและการเขียนข้อมูลเดิมปิดไว้

## ตรวจ Preview ก่อนขึ้นโดเมนจริง

```sh
pnpm audit:site
pnpm audit:contact
pnpm exec tsc --noEmit
pnpm build
pnpm start --hostname 127.0.0.1 --port 8768
# อีก terminal หนึ่ง:
pnpm audit:portfolio-http http://127.0.0.1:8768
```

มาตรฐาน build ใช้ `next build --webpack` ตาม `package.json` การตรวจ Contact ใช้ delivery adapter ในหน่วยความจำและข้อมูล `example.invalid` ไม่มีการส่งอีเมลจริง การตรวจ HTTP ส่งเฉพาะข้อมูลที่ไม่ผ่าน validation จึงไม่เรียก Resend

ตรวจ build และเส้นทางข้างต้นบน Desktop และมือถือ ตรวจชื่อ/รูป/เนื้อหาและ Motion ก่อนขึ้น Production หาก Preview ถูกป้องกันด้วย Vercel login ให้คงการป้องกันไว้และตรวจ local production build ก่อน เมื่อเจ้าของอนุมัติ ให้ตรวจ CI ของ commit ล่าสุดและ merge PR เพื่อเผยแพร่ จากนั้นตรวจ deployment และโดเมนจริงตามขั้นตอนด้านล่าง

หากใช้แบบฟอร์ม: เมื่อได้รับอนุญาตให้ส่งทดสอบแล้ว ให้ส่งคำขอหนึ่งรายการจาก Preview ไปกล่องรับที่กำหนด ตรวจทั้ง Resend และกล่องรับจริง รวมถึง Reply-To ที่ชี้กลับผู้กรอก กรณีผู้ให้บริการไม่รับคำขอหรือขาดหมายเลขรับงาน ฟอร์มต้องไม่แสดงว่าสำเร็จ การตอบสำเร็จจาก API หมายถึง Resend รับคำขอแล้ว; การถึงกล่องรับต้องตรวจแยก

หลังขึ้น Production ตรวจ deployment ว่ารัน commit ที่อนุมัติจริง เปิด `/` และ `/campus/contact` บนโดเมนจริงอีกครั้ง และตรวจว่าหน้า sign-in/ระบบงานยังปิดอยู่ ไม่ถือว่า merge สำเร็จเป็นหลักฐานว่า deploy สำเร็จ

## ย้อนกลับ / เปิดระบบเดิมในอนาคต

ย้อน deployment กลับรุ่นก่อนหน้าที่ Vercel เพื่อคืนเว็บไซต์เดิมตาม artifact และค่า environment ของรุ่นนั้น หรือเปิด `INTERNAL_WORKSPACE_ENABLED=true` พร้อม Supabase จริงและ rebuild เพื่อคืนระบบงานภายใต้การล็อกอินเดิม ถ้าต้องการหน้าหลักเดิมด้วย ให้ตั้ง `SITE_MODE=legacy` ก่อน rebuild

การเปิดระบบเดิมต้องตรวจฐานข้อมูลและ authentication จริงตาม [คู่มือระบบเดิม](deploy-prod.md) แยกจากการเผยแพร่ Portfolio สวิตช์ไม่ได้ลบข้อมูล เปลี่ยน RLS หรือเพิกถอนคีย์ฐานข้อมูล
