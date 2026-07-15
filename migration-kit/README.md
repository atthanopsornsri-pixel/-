# วิธีใช้ชุดนี้ในโปรเจกต์ใหม่

ชุดนี้เตรียมตาม `AI-CONTEXT-TRANSFER.md` (ข้อ 1) โดยมี 1 จุดที่ตั้งใจแก้ต่างจากที่เอกสารเขียนไว้ —
ดูหัวข้อ "ทำไมไม่ใช้ `.agents/AGENTS.md`" ด้านล่าง

## ขั้นตอน

1. คัดลอก `AGENTS.md` ไปไว้ที่ **root** ของโปรเจกต์ใหม่ (ไม่ใช่ใน `.agents/`)
   แล้วให้ `CLAUDE.md` ของโปรเจกต์ใหม่มีบรรทัด `@AGENTS.md` — Claude Code จะ merge เข้า context อัตโนมัติ
2. คัดลอก `MEMORY.md` ไปไว้ที่ root เช่นกัน แก้ชื่อโปรเจกต์และเติมส่วน "Stack / Test infra" ให้ตรงของจริง
   ลบ/ปรับ entry ที่ seed มาถ้าเทคสแตกใหม่ไม่ตรง (เช่นไม่ได้ใช้ Prisma)
3. เมื่อ AI ทำงานตามแนวทางที่ต้องการแล้วในโปรเจกต์ใหม่ ค่อยพิมพ์ `/learn` เพื่อบันทึกพฤติกรรมนั้นถาวร

## ทำไมไม่ใช้ `.agents/AGENTS.md`

เอกสารต้นฉบับ (`AI-CONTEXT-TRANSFER.md`) เขียนพาธไว้ว่า `.agents/AGENTS.md` แต่ Claude Code
(และ Codex/Cursor ที่ใช้คอนเวนชัน AGENTS.md เดียวกัน) discover ไฟล์นี้จาก **root ของ repo** เท่านั้น
ไม่ได้ scan ใน `.agents/` — และใน JadHor เอง โฟลเดอร์ `.agents/` ก็ถูกใช้เป็น skill library
คนละเรื่องอยู่แล้ว (`.agents/skills/...`) ถ้าวาง AGENTS.md ไว้ตรงนั้นในโปรเจกต์ใหม่จะไม่ถูกโหลดเข้า context จริง
จึงใช้ root-level `AGENTS.md` + `CLAUDE.md` → `@AGENTS.md` ตามที่ JadHor ใช้งานจริงอยู่แล้ว (verified ใช้งานได้)

## เรื่อง `/learn` ที่แชตหาย

ที่สังเกตว่า "ใช้ /learn แล้วแชตในโปรเจกต์เดิมหายหมด" — ยังไม่มีหลักฐานว่า `/learn` เป็นคำสั่งที่มี
behavior ล้าง context จริง (ไม่มี custom command ชื่อนี้ใน `.claude/commands/` ของ JadHor และไม่ใช่ built-in
slash command ของ Claude Code ที่รู้จัก) ก่อนเชื่อว่าเป็น bug ของคำสั่งนี้ ให้เช็ค:
- session/transcript เดิมยังอยู่ไหมถ้าเปิดโปรเจกต์เดิมใหม่ (อาจแค่ scroll ไม่เจอ ไม่ใช่หายจริง)
- เป็นการกด `/clear` หรือเปิด session ใหม่ปนกันหรือเปล่า
ถ้ายืนยันว่าหายจริงและทำซ้ำได้ ควรรายงานเป็น bug แยกต่างหาก ไม่ควรพึ่ง `/learn` จนกว่าจะเข้าใจ behavior จริง
