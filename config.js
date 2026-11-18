/*
 * JIKSAWSHOP — ค่าที่ผู้ดูแลแก้ไขได้ (ไม่ต้องแตะโค้ดส่วนอื่น)
 */
window.JIKSAW_CONFIG = {
  /*
   * แหล่งข้อมูลสด (ไม่บังคับ)
   * วาง URL ของ "Publish to web → CSV" จาก Google Sheets หรือ URL ของ Backend API ที่คืนค่า CSV
   * หัวคอลัมน์ต้องเป็น: หมวด, ลำดับ, รายละเอียด, โทษ/ปรับ, หมายเหตุ
   * เว้นว่าง = ใช้ข้อมูลใน data/rules.js   |   โหลดไม่สำเร็จ = ถอยกลับไปใช้ data/rules.js อัตโนมัติ
   * ห้ามใส่ API Key / Credentials ในไฟล์นี้
   */
  sheetCsvUrl: "",

  /* ประกาศสำคัญ — ข้อความจากทางร้าน ห้ามแก้ถ้อยคำ */
  announcement: "ทุกกฎจะพิจารณาการปรับหรือแบนอีกที ถ้าไม่หนักเกินจะไม่ปรับ",

  /* ช่องทางติดต่อ — ใส่ url เมื่อพร้อม (url: "" = แสดงเป็นช่องรอกรอก) */
  contacts: [
    { key: "facebook", label: "Facebook Page", url: "" },
    { key: "line",     label: "LINE",          url: "" },
    { key: "discord",  label: "Discord",       url: "" },
    { key: "other",    label: "ช่องทางอื่น ๆ",   url: "" }
  ],

  /* FAQ — เพิ่มได้เฉพาะข้อมูลที่ร้านยืนยันแล้ว ([] = ซ่อนทั้ง Section และเมนู)
     รูปแบบ: { q: "คำถาม", a: "คำตอบ" } */
  faq: []
};
