# JIKSAWSHOP — Official Rules

เว็บไซต์กฎระเบียบแบบ static (HTML + CSS + JS ล้วน ไม่มีขั้นตอน build) อัปโหลดทั้งโฟลเดอร์ขึ้นโฮสต์ใดก็ได้
เช่น Vercel, Netlify, Cloudflare Pages, GitHub Pages หรือโฮสต์ทั่วไป

## โครงสร้าง
```
index.html        หน้าเว็บทั้งหมด (ทุก Section)
404.html          หน้าไม่พบ
css/site.css      ดีไซน์ + โทเคนสีของแบรนด์ (:root)
js/config.js      ค่าที่ผู้ดูแลแก้ได้: ประกาศ, ช่องทางติดต่อ, FAQ, URL ชีตสด
js/app.js         ระบบ: โหลดข้อมูล, แสดงผล, ค้นหา, accordion, deep link
data/rules.js     ข้อมูลกฎ (สำเนาจาก Google Sheets) — แหล่งสำรองเมื่อโหลดสดไม่ได้
assets/           ภาพมาสคอต, ภาพโลกของแบรนด์, โลโก้, ภาพ OG
```

## แก้ไขกฎ
- แก้ใน `data/rules.js` แต่ละแถวคือ `[category_id, ลำดับ, รายละเอียด]`
  ระบบแปลงเป็นโครงสร้าง `id, category_id, rule_number, title, content, penalty, note, created_at, updated_at`
- เพิ่มหมวด: เพิ่มใน `categories` แล้วใช้ `id` เดียวกันในกฎ
- ฟิลด์ที่เป็น `null` จะไม่ถูกแสดง (เช่น ตอนนี้คอลัมน์ โทษ/ปรับ และ หมายเหตุ ในชีตว่างทุกแถว)

## ต่อ Google Sheets แบบสด (ไม่บังคับ)
1. ใน Google Sheets: File → Share → Publish to web → เลือกชีต → CSV
2. วาง URL ที่ได้ใน `sheetCsvUrl` ของ `js/config.js`
3. หัวคอลัมน์ต้องเป็น `หมวด, ลำดับ, รายละเอียด, โทษ/ปรับ, หมายเหตุ`
4. ถ้าโหลดไม่สำเร็จ เว็บจะใช้ `data/rules.js` แทนและแจ้งผู้ใช้

แถวที่มีอีเมลหรือคำว่า "รหัสเข้า / รหัสผ่าน / password" จะถูกกรองออกอัตโนมัติ
แต่ไม่ควรเก็บรหัสผ่านไว้ในชีตที่เผยแพร่อยู่แล้ว

## ลิงก์ตรงไปยังข้อกฎ
`https://โดเมนของคุณ/#rule-general-05` (หมวด general ข้อ 5), `#cat-post` (ทั้งหมวด)
รหัสหมวด: general, sales, pad, post, rent, website

## ก่อน Deploy
- `og:image` ใน `index.html` ควรเปลี่ยนเป็น URL เต็มของโดเมนจริง
- ใส่ลิงก์ช่องทางติดต่อใน `js/config.js`
