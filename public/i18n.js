// สลับภาษา ไทย/English: แปลข้อความบนหน้าเว็บ (ข้อความที่ไม่มีในพจนานุกรมจะคงเป็นภาษาไทย)
(() => {
  const EN = {
    "ภาพรวม":"Overview","ภาพรวมระบบ":"System overview","รายการแจ้งปัญหา":"Tickets","แจ้งปัญหาใหม่":"New ticket","ศูนย์ช่วยเหลือ":"Help center","จัดการผู้ใช้":"Users","หมวดหมู่ปัญหา":"Categories","งานที่ได้รับมอบหมาย":"My assignments",
    "ระบบ Helpdesk":"Helpdesk system","จัดการปัญหา IT ได้ในที่เดียว":"Manage IT issues in one place","ให้เป็นเรื่องง่าย":"made simple","ระบบจัดการปัญหาด้านเทคโนโลยีสารสนเทศ":"IT issue management system",
    "แจ้งปัญหา ติดตามสถานะ และจัดการงานด้าน IT ได้ในที่เดียว":"Report issues, track status and manage IT work in one place","ติดตามงานแจ้งปัญหาและความคืบหน้าได้จากหน้าเดียว":"Track issues and progress from a single page",
    "✓ จัดการงานอย่างเป็นระบบ":"✓ Organized workflow","✓ ติดตามความคืบหน้า":"✓ Track progress","✓ แจ้งปัญหาได้สะดวก":"✓ Easy reporting",
    "#1042 แก้ไขแล้ว":"#1042 Resolved","Wi-Fi ชั้น 3 กลับมาใช้งานได้":"3rd-floor Wi-Fi is back online","#1043 กำลังดำเนินการ":"#1043 In progress","ช่างกำลังตรวจสอบเครื่องพิมพ์":"Technician is checking the printer","#1044 รอดำเนินการ":"#1044 Pending","ขอติดตั้งโปรแกรมใหม่":"Request to install new software",
    "แก้ไขทุกปัญหา":"Fix every issue","รายการ Ticket ที่ระบบแสดงให้บัญชีนี้":"Tickets visible to this account","ตรวจสอบรายละเอียดและสถานะของ Ticket":"Review ticket details and status","ตรวจสอบและอัปเดตสถานะงานที่รับผิดชอบ":"Review and update the status of your assigned work","กำลังโหลด":"Loading","กำลังโหลดหมวดหมู่...":"Loading categories...","รายการ":"items",
    "เข้าสู่ระบบ":"Sign in","เข้าสู่ระบบเพื่อเริ่มใช้งาน":"Sign in to get started","ใช้บัญชีที่ลงทะเบียนไว้ในระบบ NEXUS IT Helpdesk":"Use your NEXUS IT Helpdesk account","อีเมล":"Email","รหัสผ่าน":"Password","ยืนยันรหัสผ่าน":"Confirm password","อย่างน้อย 8 ตัวอักษร":"At least 8 characters",
    "สมัครสมาชิก":"Sign up","สร้างบัญชีเพื่อใช้งาน NEXUS IT Helpdesk":"Create an account for NEXUS IT Helpdesk","ยังไม่มีบัญชี?":"No account yet?","มีบัญชีอยู่แล้ว?":"Already have an account?","กลับไปเข้าสู่ระบบ":"Back to sign in","กรอกชื่อผู้ใช้งาน":"Enter your name","กรอกรหัสผ่าน":"Enter password","กรอกรหัสผ่านอีกครั้ง":"Re-enter password","ชื่อผู้ใช้งาน":"Full name",
    "ออกจากระบบ":"Sign out","พร้อมให้บริการ":"Online","เมนูหลัก":"Main menu","เปิดเมนู":"Open menu","สลับโหมดสว่าง/มืด":"Toggle light/dark","ค้นหาด่วน (Ctrl+K)":"Quick search (Ctrl+K)","การแจ้งเตือน":"Notifications","ยังไม่มีการแจ้งเตือน":"No notifications yet",
    "ผู้ดูแลระบบ":"Administrator","ช่างเทคนิค":"Technician","ผู้ใช้งาน":"User","ยังไม่ได้เข้าสู่ระบบ":"Not signed in","ยินดีต้อนรับ":"Welcome","สรุปข้อมูลการแจ้งปัญหา IT ของคุณ":"Summary of your IT tickets","ตรวจสอบ Ticket และติดตามสถานะ":"Review tickets and track status","ส่งรายละเอียดปัญหาให้ทีม IT":"Send issue details to the IT team","ดูบัญชีและบทบาทของผู้ใช้งาน":"View accounts and roles","จัดการหมวดหมู่สำหรับ Ticket":"Manage ticket categories","จัดการ Ticket ที่ได้รับมอบหมาย":"Manage assigned tickets",
    "↻ รีเฟรชข้อมูล":"↻ Refresh","รีเฟรชข้อมูล":"Refresh","ทั้งหมด":"Total","รายการทั้งหมด":"All tickets","จำนวน Ticket ที่เข้าถึงได้":"Tickets you can access","งานที่ยังไม่เสร็จสิ้น":"Open work","งานที่กำลังแก้ไข":"Being worked on","งานที่แก้ไขเสร็จแล้ว":"Resolved work",
    "สรุปสถานะ Ticket":"Ticket status summary","สัดส่วนงานแยกตามสถานะและระดับความสำคัญ":"Breakdown by status and priority","กราฟโดนัตสถานะ Ticket":"Ticket status donut chart","ยกเลิก/อื่น ๆ":"Cancelled/other",
    "คะแนนรีวิวช่าง IT":"IT technician ratings","สรุปคะแนนเฉลี่ยและจำนวนรีวิวของช่างแต่ละคน":"Average score and review count per technician","ชื่อช่าง":"Technician","คะแนนเฉลี่ย":"Average score","จำนวนรีวิว":"Reviews","ยังไม่มีคะแนน":"No ratings yet","ยังไม่มีข้อมูลช่างในระบบ":"No technicians yet",
    "รายการแจ้งปัญหาล่าสุด":"Latest tickets","ดูรายการทั้งหมด →":"View all →","เลขที่":"No.","หัวข้อ":"Title","หมวดหมู่":"Category","ความสำคัญ":"Priority","สถานะ":"Status","อายุงาน":"Age","ผู้รับผิดชอบ":"Assignee","จัดการ":"Actions","รีวิวช่าง":"Review","ประวัติ":"History","แก้ไข":"Edit","ลบ":"Delete","ชื่อ":"Name","บทบาท":"Role","รายละเอียด":"Details",
    "ต่ำ":"Low","ปานกลาง":"Medium","สูง":"High","เร่งด่วน":"Urgent","รอดำเนินการ":"Pending","กำลังดำเนินการ":"In progress","แก้ไขแล้ว":"Resolved","มอบหมายแล้ว":"Assigned","เสร็จสิ้น":"Completed","ยกเลิก":"Cancel","ไม่ระบุ":"Not specified","เมื่อสักครู่":"just now",
    "เกิน SLA":"SLA breached","ใกล้ครบกำหนด":"Due soon","ตามกำหนด":"On track",
    "ยังไม่มีรายการแจ้งปัญหา":"No tickets yet","ยังไม่มีงานที่ได้รับมอบหมาย":"No assigned tickets","ยังไม่มีหมวดหมู่":"No categories yet","ไม่พบข้อมูลผู้ใช้":"No users found","ยังไม่มีบัญชี Technician":"No technician accounts",
    "ทุกสถานะ":"All statuses","ทุกระดับ":"All priorities","ค้นหาหัวข้อ เลขที่ หรือหมวดหมู่...":"Search title, number or category...","ค้นหา Ticket":"Search tickets","กรองตามสถานะ":"Filter by status","กรองตามความสำคัญ":"Filter by priority","⭳ ส่งออก CSV":"⭳ Export CSV","ส่งออกไฟล์ CSV แล้ว":"CSV exported",
    "หัวข้อปัญหา":"Issue title","เช่น คอมพิวเตอร์เปิดไม่ติด":"e.g. Computer won't turn on","กรอกรายละเอียดเพื่อส่งคำขอให้ทีม IT":"Fill in the details to send your request to IT","อธิบายอาการหรือปัญหาที่พบ":"Describe the symptoms or problem","ระดับความสำคัญ":"Priority level","เลือกหมวดหมู่":"Select category","ส่งรายการแจ้งปัญหา":"Submit ticket","ส่งรายการแจ้งปัญหาสำเร็จ":"Ticket submitted","กำลังส่ง...":"Sending...","กำลังบันทึก...":"Saving...",
    "เพิ่มหมวดหมู่":"Add category","ชื่อหมวดหมู่":"Category name","รายละเอียดหมวดหมู่":"Category details","เพิ่ม แก้ไข และลบหมวดหมู่สำหรับ Ticket":"Add, edit and delete ticket categories","เพิ่มหมวดหมู่สำเร็จ":"Category added","แก้ไขหมวดหมู่สำเร็จ":"Category updated","ลบหมวดหมู่สำเร็จ":"Category deleted","แก้ไขชื่อหมวดหมู่:":"Edit category name:","แก้ไขรายละเอียดหมวดหมู่:":"Edit category details:",
    "ดูบัญชีและบทบาทของผู้ใช้ในระบบ":"View user accounts and roles","เปลี่ยนบทบาท":"Change role","บันทึกบทบาทผู้ใช้แล้ว":"Role saved","ยืนยันเปลี่ยนบทบาทผู้ใช้นี้หรือไม่?":"Change this user's role?","มอบหมายงาน":"Assign","เลือก Technician":"Select technician","กรุณาเลือก Technician ก่อนมอบหมายงาน":"Please select a technician first","อัปเดตสถานะ":"Update status","อัปเดตสถานะ Ticket สำเร็จ":"Ticket status updated","มอบหมายงานสำเร็จ":"Assigned successfully",
    "หมายเหตุการอัปเดตสถานะ (เว้นว่างได้):":"Status update note (optional):","ประวัติ Ticket":"Ticket history","ดูประวัติ":"View history","ปิด ✕":"Close ✕","ปิดหน้าต่างประวัติ":"Close history","ปิดหน้าต่างแก้ไข":"Close edit","แก้ไข Ticket":"Edit ticket","บันทึกการแก้ไข":"Save changes","บันทึก":"Save","บันทึกการดำเนินงาน":"Work log","ผู้ดำเนินการ:":"By:","หมายเหตุ:":"Note:","ไม่ระบุผู้ดำเนินการ":"Unknown user","ไม่ระบุวันเวลา":"Unknown time","กำลังโหลดประวัติ...":"Loading history...","กำลังโหลดประวัติการดำเนินงาน...":"Loading history...","ยังไม่มีประวัติการดำเนินงานสำหรับ Ticket นี้":"No history for this ticket yet","ไม่สามารถโหลดประวัติได้":"Could not load history",
    "รีวิวการให้บริการช่าง":"Rate the technician","คะแนนการให้บริการ (1–5 ดาว)":"Service rating (1–5 stars)","เลือกคะแนน":"Select rating","1 ดาว — ต้องปรับปรุงมาก":"1 star — needs a lot of work","2 ดาว — ควรปรับปรุง":"2 stars — could improve","3 ดาว — ปานกลาง":"3 stars — fair","4 ดาว — ดี":"4 stars — good","5 ดาว — ดีมาก":"5 stars — excellent","ความคิดเห็นเพิ่มเติม (ไม่บังคับ)":"Additional comments (optional)","เขียนความคิดเห็นเกี่ยวกับการให้บริการ...":"Write your feedback...","ส่งรีวิว":"Submit review","ส่งรีวิวเรียบร้อยแล้ว":"Review submitted","ส่งรีวิวไม่สำเร็จ":"Could not submit review","รีวิวได้เมื่อแก้ไขแล้ว":"Review once resolved","สามารถรีวิวได้เมื่อช่างแก้ไขปัญหาแล้ว":"You can review after the issue is resolved","กรุณาเลือกคะแนนตั้งแต่ 1–5 ดาว":"Please pick 1–5 stars",
    "กรุณากรอกอีเมลและรหัสผ่าน":"Please enter email and password","กรุณากรอกอีเมล":"Please enter your email","กรุณากรอกรหัสผ่าน":"Please enter your password","กรุณากรอกข้อมูลให้ครบทุกช่อง":"Please fill in every field","กรุณากรอกอีเมลให้ถูกต้อง":"Please enter a valid email","รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร":"Password must be at least 8 characters","รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน":"Passwords do not match","เข้าสู่ระบบไม่สำเร็จ":"Sign-in failed","สมัครสมาชิกสำเร็จ":"Sign-up successful","สมัครสมาชิกไม่สำเร็จ":"Sign-up failed","กรุณากรอกหัวข้อและรายละเอียดให้ครบ":"Please fill in title and details","กรุณาเลือกหมวดหมู่":"Please select a category","กรุณาเลือกหมวดหมู่ปัญหา":"Please select a category","ไม่พบ Ticket นี้ หรือคุณไม่มีสิทธิ์เข้าถึง":"Ticket not found or no access","อีเมลหรือรหัสผ่านไม่ถูกต้อง":"Incorrect email or password",
    "ตกลง":"OK","ยืนยัน":"Confirm","ลบเลย":"Delete","ส่ง":"Send","ปิด":"Close","กำลังโหลด...":"Loading...",
    "คำถามที่พบบ่อย":"Frequently asked questions","ลองหาคำตอบก่อนแจ้งปัญหา อาจแก้ได้ทันที":"Try finding an answer first — it may fix it right away","คำตอบสำหรับปัญหาที่พบบ่อย":"Answers to common problems","ค้นหาคำถาม":"Search questions","ค้นหาคำถาม เช่น wifi, เครื่องพิมพ์...":"Search e.g. wifi, printer...","ไม่พบคำตอบที่ตรงกัน ลองแจ้งปัญหาใหม่ให้ทีม IT ช่วยดูได้เลย":"No matching answer. Submit a new ticket and IT will help.",
    "เข้าสู่ระบบไม่ได้ ต้องทำอย่างไร":"I can't sign in. What should I do?","ตรวจสอบว่าอีเมลและรหัสผ่านถูกต้อง รหัสผ่านแยกตัวพิมพ์เล็ก-ใหญ่ หากยังเข้าไม่ได้ให้แจ้งผู้ดูแลระบบเพื่อตรวจสอบบัญชี":"Check your email and password (passwords are case-sensitive). If you still can't sign in, ask an administrator to check your account.",
    "คอมพิวเตอร์เปิดไม่ติด":"My computer won't turn on","ตรวจสอบสายไฟและปลั๊กก่อน ลองกดปุ่มเปิดค้างไว้ 10 วินาที หากยังไม่ติดให้แจ้งปัญหาในหมวดฮาร์ดแวร์ พร้อมบอกอาการที่เห็น เช่น มีไฟหรือเสียงหรือไม่":"Check the power cable and socket first, then hold the power button for 10 seconds. If it still won't start, file a hardware ticket and describe what you see, such as lights or sounds.",
    "เชื่อมต่อ Wi-Fi ไม่ได้":"I can't connect to Wi-Fi","ปิดแล้วเปิด Wi-Fi ใหม่ ลืมเครือข่ายแล้วเชื่อมต่อใหม่ หากหลายคนเจอพร้อมกัน ให้แจ้งปัญหาด่วนในหมวดเครือข่าย":"Turn Wi-Fi off and on, or forget the network and reconnect. If many people are affected, file an urgent ticket under Network.",
    "เครื่องพิมพ์พิมพ์ไม่ออก":"The printer won't print","เช็กว่ามีกระดาษและหมึก เครื่องเปิดอยู่และต่อเครือข่ายเดียวกัน ลองลบงานพิมพ์ที่ค้างในคิว แล้วสั่งพิมพ์ใหม่":"Check paper and ink, that the printer is on and on the same network. Clear stuck jobs from the queue and print again.",
    "ระดับความสำคัญเลือกอย่างไร":"How do I choose a priority?","ต่ำ: ไม่กระทบงาน • ปานกลาง: กระทบงานบางส่วน • สูง: ทำงานต่อไม่ได้ • เร่งด่วน: กระทบหลายคนหรือระบบหลัก":"Low: no impact • Medium: partly affects work • High: can't continue working • Urgent: affects many people or core systems",
    "ระบบนับเวลา SLA อย่างไร":"How is SLA measured?","นับตั้งแต่สร้าง Ticket เป้าหมายคือ เร่งด่วน 4 ชม. สูง 8 ชม. ปานกลาง 24 ชม. ต่ำ 72 ชม. งานที่ใกล้ครบจะขึ้นสีเหลือง งานที่เกินจะขึ้นสีแดง":"Counted from ticket creation. Targets: Urgent 4h, High 8h, Medium 24h, Low 72h. Tickets close to the limit turn yellow; overdue ones turn red.",
    "ติดตามสถานะงานได้ที่ไหน":"Where can I track my ticket?","ที่หน้ารายการแจ้งปัญหา กดดูประวัติเพื่อดูว่าใครอัปเดตอะไรและเมื่อไร":"On the Tickets page, open History to see who updated what and when.",
    "รีวิวช่างได้เมื่อไร":"When can I review a technician?","เมื่อสถานะเป็นแก้ไขแล้ว จะมีปุ่มรีวิวช่างในรายการ รีวิวได้ครั้งเดียวต่อ Ticket":"Once a ticket is resolved, a review button appears. You can review each ticket once.",
    "รูปภาพแนบ":"Attachments","ความคิดเห็น":"Comments","พิมพ์ความคิดเห็น...":"Write a comment...","ยังไม่มีรูปแนบ":"No attachments","ยังไม่มีความคิดเห็น เริ่มสนทนาได้เลย":"No comments yet — start the conversation","💬 รายละเอียด":"💬 Details","รีเซ็ตรหัสผ่าน":"Reset password","แนบรูปสำเร็จ":"Image attached","ไม่พบหมวดหมู่":"No category",
    "โปรไฟล์ของฉัน":"My profile","ชื่อที่แสดง":"Display name","บันทึกชื่อ":"Save name","รหัสผ่านปัจจุบัน":"Current password","รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)":"New password (at least 8 characters)","เปลี่ยนรหัสผ่าน":"Change password","บันทึกโปรไฟล์สำเร็จ":"Profile saved","เปลี่ยนรหัสผ่านสำเร็จ":"Password changed","รีเซ็ตรหัสผ่านสำเร็จ":"Password reset",
    "พิมพ์เพื่อค้นหาคำสั่ง หรือหน้าที่ต้องการ...":"Type to search commands or pages...","ไปที่หน้า":"Go to page","การตั้งค่า":"Settings","การทำงาน":"Actions","บัญชี":"Account","ไม่พบคำสั่งที่ตรงกัน":"No matching commands","ค้นหาคำสั่ง":"Search commands",
    "แนวโน้ม Ticket รายวัน":"Daily ticket trend","จำนวน Ticket ที่รับเรื่องและแก้ไขแล้วในแต่ละวัน":"Tickets received and resolved each day","รับเรื่อง":"Received","7 วัน":"7 days","14 วัน":"14 days","30 วัน":"30 days","รวมช่วงนี้":"Total in range","เฉลี่ยต่อวัน":"Daily average","วันที่งานเข้ามากสุด":"Busiest day","กราฟเส้นแนวโน้ม Ticket รายวัน":"Daily ticket trend line chart"
  };
  const RX = [
    [/^ยินดีต้อนรับ (.+)$/, "Welcome, $1"], [/^ประวัติ Ticket #(\d+)$/, "Ticket #$1 history"], [/^(\d+) รีวิว$/, "$1 reviews"],
    [/^พบ (\d+) จาก (\d+) รายการ$/, "$1 of $2 items"], [/^รายการแจ้งปัญหาเลขที่ (\d+)$/, "Ticket no. $1"],
    [/^ค้าง (.+?) • (.+)$/, (m, a, b) => "Open " + unit(a) + " • " + (EN[b] || b)], [/^ผู้รับผิดชอบปัจจุบัน: (.+)$/, "Current assignee: $1"],
    [/^มอบหมาย Ticket #(\d+) ให้ (.+) แล้ว$/, "Ticket #$1 assigned to $2"], [/^ยืนยันมอบหมาย Ticket #(\d+) ให้ (.+) หรือไม่\?$/, "Assign ticket #$1 to $2?"],
    [/^ยืนยันลบหมวดหมู่ "(.+)" หรือไม่\?$/, 'Delete category "$1"?'], [/^แก้ไข Ticket #(\d+) สำเร็จ$/, "Ticket #$1 updated"],
    [/^เลือกช่างสำหรับ Ticket (\d+)$/, "Select technician for ticket $1"], [/^รายการ #(\d+): (.+)$/, "Ticket #$1: $2"],
    [/^(.+) \(งานค้าง (\d+)\)$/, "$1 ($2 open)"], [/^เกิดข้อผิดพลาด \((\d+)\)$/, "Error ($1)"],
    [/^ตั้งรหัสผ่านใหม่ให้ผู้ใช้ #(\d+) \(อย่างน้อย 8 ตัวอักษร\)$/, "Set a new password for user #$1 (min. 8 characters)"],
    [/^ความคิดเห็นเพิ่มเติม$/, "Comments"], [/^(\d+) วัน$/, "$1 d"]
  ];
  const unit = (s) => s.replace(/ชม\./, "h").replace(/นาที/, "min").replace(/วัน/, "d");
  const KEYS = Object.keys(EN).filter((k) => k.length >= 6).sort((a, b) => b.length - a.length);
  const TH = /[\u0E00-\u0E7F]/;
  function tr(t) {
    if (EN[t]) return EN[t];
    for (const [r, v] of RX) if (r.test(t)) return t.replace(r, v);
    let o = t;
    for (const k of KEYS) if (o.includes(k)) o = o.split(k).join(EN[k]);
    return o.replace(/(\d+) ชม\./g, "$1 h").replace(/(\d+) นาที/g, "$1 min");
  }
  let en = (window.LANG || "th") === "en", busy = false, obs, raf;
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA)$/;
  function text(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentNode && SKIP.test(n.parentNode.nodeName)) continue;
      const v = n.nodeValue;
      if (n.__en !== undefined && v === n.__en) { if (!en) { n.nodeValue = n.__th; n.__en = undefined; } continue; }
      if (!TH.test(v)) continue;
      if (!en) continue;
      n.__th = v;
      const m = v.match(/^(\s*)([\s\S]*?)(\s*)$/);
      n.__en = m[1] + tr(m[2].replace(/\s+/g, " ")) + m[3];
      n.nodeValue = n.__en;
    }
  }
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function attrs(root) {
    root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((el) => {
      el.__a = el.__a || {};
      ATTRS.forEach((a) => {
        if (!el.hasAttribute(a)) return;
        const v = el.getAttribute(a);
        if (el.__a[a] && v === el.__a[a].en) { if (!en) { el.setAttribute(a, el.__a[a].th); delete el.__a[a]; } return; }
        if (!en || !TH.test(v)) return;
        const e = tr(v.trim());
        el.__a[a] = { th: v, en: e };
        el.setAttribute(a, e);
      });
    });
  }
  function run() {
    busy = true; obs && obs.disconnect();
    text(document.body); attrs(document.body);
    document.documentElement.lang = en ? "en" : "th";
    obs && obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    busy = false;
  }
  function setLang(l) {
    en = l === "en"; window.LANG = l;
    try { localStorage.setItem("lang", l); } catch (e) {}
    const b = document.getElementById("lang-toggle"); if (b) b.textContent = en ? "TH" : "EN";
    run();
    if (typeof openPage === "function" && typeof state !== "undefined" && state.user) openPage(state.page || "dashboard");
  }
  addEventListener("DOMContentLoaded", () => {
    obs = new MutationObserver(() => { if (busy || !en) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
    const b = document.getElementById("lang-toggle");
    if (b) { b.textContent = en ? "TH" : "EN"; b.addEventListener("click", () => setLang(en ? "th" : "en")); }
    run();
  });
})();
