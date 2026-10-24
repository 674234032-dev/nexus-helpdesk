// เอฟเฟกต์เสริม (ไม่แตะ logic เดิมใน script.js): ตัวเลขสถิติวิ่งขึ้น
(() => {
  document.addEventListener("mousemove", (e) => {
    const c = e.target.closest && e.target.closest(".stat-card,.content-card,.float-card");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const run = (el) => {
    const to = parseInt(el.textContent, 10);
    if (isNaN(to) || el.dataset.n === String(to)) return;
    el.dataset.n = to;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 900, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".stat-card > strong").forEach((el) => {
      new MutationObserver(() => {
        if (el.dataset.busy) return;
        el.dataset.busy = 1; run(el);
        setTimeout(() => delete el.dataset.busy, 950);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  });
})();

// สลับโหมดสว่าง/มืด + กราฟสรุปสถานะ Ticket
(() => {
  const root = document.documentElement;
  const icon = () => {
    const b = document.getElementById("theme-toggle");
    if (b) b.textContent = root.dataset.theme === "light" ? "☾" : "☀";
  };
  const NS = "http://www.w3.org/2000/svg", R = 48, C = 2 * Math.PI * R;
  const groups = [
    ["รอดำเนินการ", ["open", "pending", "assigned"]],
    ["กำลังดำเนินการ", ["in_progress"]],
    ["แก้ไขแล้ว", ["resolved", "completed"]],
    ["ยกเลิก/อื่น ๆ", null]
  ];
  const cols = ["var(--gold)", "var(--sky)", "#4ade80", "var(--rose)"];
  const pri = [["ต่ำ", "low", "var(--jade)"], ["ปานกลาง", "medium", "var(--gold)"], ["สูง", "high", "#ff9d6c"], ["เร่งด่วน", "urgent", "var(--rose)"]];
  let timer;

  function draw() {
    const svg = document.getElementById("status-donut");
    if (!svg || typeof state === "undefined") return;
    const t = state.tickets || [], total = t.length;
    const known = groups.slice(0, 3).flatMap((g) => g[1]);
    const counts = groups.map((g) => g[1] ? t.filter((x) => g[1].includes(x.status)).length : t.filter((x) => !known.includes(x.status)).length);
    svg.innerHTML = '<circle class="track" cx="60" cy="60" r="' + R + '"/>';
    let offset = 0;
    counts.forEach((n, i) => {
      if (!n) return;
      const len = (n / total) * C, c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "seg-" + i); c.setAttribute("cx", 60); c.setAttribute("cy", 60); c.setAttribute("r", R);
      c.setAttribute("stroke-dasharray", "0 " + C); c.setAttribute("stroke-dashoffset", -offset);
      svg.appendChild(c);
      requestAnimationFrame(() => requestAnimationFrame(() => c.setAttribute("stroke-dasharray", Math.max(len - 2, 0.5) + " " + C)));
      offset += len;
    });
    document.getElementById("donut-total").textContent = total;
    document.getElementById("status-legend").innerHTML = groups.map((g, i) =>
      '<li style="--c:' + cols[i] + '"><i></i>' + g[0] + '<b>' + counts[i] + '</b><em>' + (total ? Math.round(counts[i] / total * 100) : 0) + '%</em></li>').join("");
    document.getElementById("priority-bars").innerHTML = '<h4>ระดับความสำคัญ</h4>' + pri.map((p) => {
      const n = t.filter((x) => x.priority === p[1]).length;
      return '<div class="pbar" style="--c:' + p[2] + '"><span>' + p[0] + '</span><div class="t"><span data-w="' + (total ? n / total * 100 : 0) + '"></span></div><b>' + n + '</b></div>';
    }).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#priority-bars [data-w]").forEach((e) => (e.style.width = e.dataset.w + "%"))));
  }

  addEventListener("DOMContentLoaded", () => {
    icon();
    document.getElementById("theme-toggle")?.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
      icon();
    });
    const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(draw, 150); });
    ["#stat-total", "#stat-open", "#stat-progress", "#stat-resolved"].forEach((s) => {
      const el = document.querySelector(s);
      if (el) obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
    draw();
  });
})();

// ข้อความ "สำเร็จ" ในฟอร์ม: แสดงเป็น Toast แล้วหายเอง แทนการค้างบนหน้า
(() => {
  addEventListener("DOMContentLoaded", () => {
    const view = document.getElementById("app-view");
    if (!view) return;
    new MutationObserver((list) => {
      list.forEach((m) => {
        const el = m.target;
        if (!(el instanceof Element) || !el.classList.contains("message") || !el.classList.contains("success")) return;
        const text = el.textContent.trim();
        el.className = "message hidden";
        el.textContent = "";
        if (text && typeof showToast === "function") showToast(text, false);
      });
    }).observe(view, { attributes: true, attributeFilter: ["class"], subtree: true });
  });
})();

// กล่องโต้ตอบสวย ๆ แทน alert/confirm/prompt
(() => {
  function dlg({ msg, kind, def, input, cancelVal, okText }) {
    return new Promise((res) => {
      const o = document.createElement("div");
      o.className = "dlg";
      o.innerHTML = '<div class="dlg-box" role="dialog" aria-modal="true"><div class="dlg-ico ' + (kind === "danger" ? "danger" : "") + '">' +
        ({ alert: "!", confirm: "?", prompt: "✎", danger: "!" })[kind] + '</div><p></p>' + (input ? '<input class="dlg-in">' : "") + '<div class="dlg-act"></div></div>';
      o.querySelector("p").textContent = msg;
      const inp = o.querySelector("input"), act = o.querySelector(".dlg-act");
      if (inp) inp.value = def || "";
      const done = (v) => { o.remove(); removeEventListener("keydown", key, true); res(v); };
      const add = (t, cls, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "button " + cls; b.textContent = t; b.onclick = fn; act.appendChild(b); return b; };
      if (kind !== "alert") add("ยกเลิก", "button-light", () => done(cancelVal));
      const ok = add(okText, kind === "danger" ? "button-danger" : "button-primary", () => done(inp ? inp.value : true));
      function key(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(cancelVal); }
        else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); ok.click(); }
      }
      addEventListener("keydown", key, true);
      o.addEventListener("mousedown", (e) => { if (e.target === o && kind !== "alert") done(cancelVal); });
      document.body.appendChild(o);
      (inp || ok).focus();
      if (inp) inp.select();
    });
  }
  window.uiAlert = (msg) => dlg({ msg, kind: "alert", okText: "ตกลง" });
  window.uiConfirm = (msg) => dlg({ msg, kind: /ลบ/.test(msg) ? "danger" : "confirm", cancelVal: false, okText: /ลบ/.test(msg) ? "ลบเลย" : "ยืนยัน" });
  window.uiPrompt = (msg, def) => dlg({ msg, kind: "prompt", input: true, def, cancelVal: null, okText: "บันทึก" });
})();

// ค้นหา/กรอง Ticket + ส่งออก CSV + แสดงรหัสผ่าน/วัดความแข็งแรง
(() => {
  const $ = (s) => document.querySelector(s);
  function apply() {
    const q = ($("#f-q")?.value || "").trim().toLowerCase(), st = $("#f-status")?.value || "", pr = $("#f-priority")?.value || "";
    let n = 0, all = 0;
    document.querySelectorAll("#tickets-list tbody tr").forEach((tr) => {
      all++;
      const pill = tr.querySelector(".status-pill");
      const ok = (!q || tr.textContent.toLowerCase().includes(q)) &&
        (!st || (pill && st.split(",").some((s) => pill.classList.contains("status-" + s)))) &&
        (!pr || (tr.children[3] && tr.children[3].textContent.trim() === pr));
      tr.style.display = ok ? "" : "none";
      if (ok) n++;
    });
    const c = $("#f-count");
    if (c) c.textContent = all ? "พบ " + n + " จาก " + all + " รายการ" : "";
  }
  function exportCSV() {
    const t = (typeof state !== "undefined" && state.tickets) || [];
    if (!t.length) { if (typeof showToast === "function") showToast("ยังไม่มีข้อมูลให้ส่งออก", true); return; }
    const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const rows = [["เลขที่", "หัวข้อ", "หมวดหมู่", "ความสำคัญ", "สถานะ", "ผู้รับผิดชอบ"]].concat(t.map((x) => [
      x.id, x.title, x.category_name || x.category, typeof priorityName === "function" ? priorityName(x.priority) : x.priority,
      typeof statusName === "function" ? statusName(x.status) : x.status, x.technician_name || x.technician || ""]));
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tickets-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (typeof showToast === "function") showToast("ส่งออกไฟล์ CSV แล้ว", false);
  }
  function passwords() {
    document.querySelectorAll('input[type="password"]').forEach((inp) => {
      const w = document.createElement("div");
      w.className = "pw-wrap";
      inp.parentNode.insertBefore(w, inp);
      w.appendChild(inp);
      const b = document.createElement("button");
      b.type = "button"; b.className = "pw-eye"; b.textContent = "แสดง"; b.setAttribute("aria-label", "แสดงหรือซ่อนรหัสผ่าน");
      b.onclick = () => { const s = inp.type === "password"; inp.type = s ? "text" : "password"; b.textContent = s ? "ซ่อน" : "แสดง"; };
      w.appendChild(b);
      if (inp.id === "register-password") {
        const m = document.createElement("div"), l = document.createElement("div");
        m.className = "pw-meter"; m.innerHTML = "<i></i>"; l.className = "pw-label";
        w.after(m, l);
        inp.addEventListener("input", () => {
          const v = inp.value;
          const sc = v ? (v.length >= 8) + (/[a-z]/.test(v) && /[A-Z]/.test(v)) + /\d/.test(v) + /[^A-Za-z0-9]/.test(v) : 0;
          const lv = [["", "0%", "var(--rose)"], ["อ่อน", "25%", "var(--rose)"], ["พอใช้", "50%", "var(--gold)"], ["ดี", "75%", "var(--sky)"], ["แข็งแรง", "100%", "#4ade80"], ["แข็งแรง", "100%", "#4ade80"]][sc];
          const bar = m.firstChild; bar.style.width = lv[1]; bar.style.setProperty("--c", lv[2]);
          l.textContent = lv[0] ? "ความแข็งแรงรหัสผ่าน: " + lv[0] : "";
        });
      }
    });
  }
  addEventListener("DOMContentLoaded", () => {
    ["#f-q", "#f-status", "#f-priority"].forEach((s) => $(s)?.addEventListener("input", apply));
    $("#export-csv")?.addEventListener("click", exportCSV);
    const list = $("#tickets-list");
    if (list) new MutationObserver(apply).observe(list, { childList: true });
    passwords();
  });
})();

// ค้นหา FAQ + เมนูค้นหาด่วน (Ctrl+K)
(() => {
  addEventListener("DOMContentLoaded", () => {
    document.getElementById("faq-search")?.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      let n = 0;
      document.querySelectorAll(".faq-item").forEach((d) => {
        const ok = !q || d.textContent.toLowerCase().includes(q);
        d.style.display = ok ? "" : "none";
        if (ok) n++;
      });
      document.getElementById("faq-empty")?.classList.toggle("hidden", n > 0);
    });

    function openPalette() {
      if (document.getElementById("app-view")?.classList.contains("hidden") || document.querySelector(".pal")) return;
      const cmds = [...document.querySelectorAll("#navigation .nav-item:not(.hidden)")].map((b) => [b.textContent.replace(/\s+/g, " ").trim().slice(2).trim() || b.textContent.trim(), "ไปที่หน้า", () => b.click()]);
      cmds.push(["สลับโหมดสว่าง/มืด", "การตั้งค่า", () => document.getElementById("theme-toggle")?.click()],
        ["รีเฟรชข้อมูล", "การทำงาน", () => document.getElementById("refresh-button")?.click()],
        ["ออกจากระบบ", "บัญชี", () => document.getElementById("logout-button")?.click()]);
      const o = document.createElement("div");
      o.className = "dlg pal";
      o.innerHTML = '<div class="dlg-box" role="dialog" aria-modal="true"><input placeholder="พิมพ์เพื่อค้นหาคำสั่ง หรือหน้าที่ต้องการ..." aria-label="ค้นหาคำสั่ง"><div class="pal-list"></div></div>';
      const inp = o.querySelector("input"), list = o.querySelector(".pal-list");
      let cur = [], idx = 0;
      const close = () => { o.remove(); removeEventListener("keydown", key, true); };
      const run = (c) => { close(); c[2](); };
      const render = () => {
        const q = inp.value.trim().toLowerCase();
        cur = cmds.filter((c) => c[0].toLowerCase().includes(q));
        idx = Math.min(idx, Math.max(cur.length - 1, 0));
        list.innerHTML = "";
        cur.forEach((c, i) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "pal-item" + (i === idx ? " on" : "");
          b.innerHTML = "<span></span><small></small>";
          b.firstChild.textContent = c[0]; b.lastChild.textContent = c[1];
          b.onclick = () => run(c);
          list.appendChild(b);
        });
        if (!cur.length) list.innerHTML = '<div class="empty-state">ไม่พบคำสั่งที่ตรงกัน</div>';
      };
      function key(e) {
        if (e.key === "Escape") { e.stopPropagation(); close(); }
        else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + cur.length) % (cur.length || 1); render(); }
        else if (e.key === "Enter" && cur[idx]) { e.preventDefault(); e.stopPropagation(); run(cur[idx]); }
      }
      addEventListener("keydown", key, true);
      inp.addEventListener("input", () => { idx = 0; render(); });
      o.addEventListener("mousedown", (e) => { if (e.target === o) close(); });
      document.body.appendChild(o);
      render(); inp.focus();
    }
    addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); } });
    document.getElementById("palette-btn")?.addEventListener("click", openPalette);
  });
})();

// รายละเอียด Ticket (คอมเมนต์ + รูปแนบ), การแจ้งเตือน, โปรไฟล์, รีเซ็ตรหัสผ่าน (Admin)
(() => {
  const $ = (s) => document.querySelector(s);
  const fmt = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(window.LANG === "en" ? "en-GB" : "th-TH", { dateStyle: "medium", timeStyle: "short" }); };
  const toast = (m, e) => typeof showToast === "function" && showToast(m, !!e);
  const roleTh = { admin: "ผู้ดูแลระบบ", technician: "ช่างเทคนิค", user: "ผู้ใช้งาน" };

  function modal(html) {
    const o = document.createElement("div");
    o.className = "dlg";
    o.innerHTML = '<div class="dlg-box wide" role="dialog" aria-modal="true">' + html + "</div>";
    const close = () => { o.remove(); removeEventListener("keydown", k, true); };
    const k = (e) => { if (e.key === "Escape" && o === [...document.querySelectorAll(".dlg")].pop()) { e.stopPropagation(); close(); } };
    addEventListener("keydown", k, true);
    o.addEventListener("mousedown", (e) => { if (e.target === o) close(); });
    o.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });
    document.body.appendChild(o);
    return { o, close };
  }

  async function openTicket(id) {
    const t = ((typeof state !== "undefined" && state.tickets) || []).find((x) => String(x.id) === String(id)) || {};
    const { o } = modal('<div class="tk-head"><div><small>Ticket #' + Number(id) + '</small><h3></h3></div><button type="button" class="action-button" data-x>ปิด ✕</button></div>' +
      '<p class="tk-desc"></p><h4>รูปภาพแนบ</h4><div class="tk-files"></div><div class="tk-up"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif"></div>' +
      '<h4>ความคิดเห็น</h4><div class="tk-comments" aria-live="polite"></div>' +
      '<div class="tk-form"><textarea rows="2" maxlength="2000" placeholder="พิมพ์ความคิดเห็น..." aria-label="ความคิดเห็น"></textarea><button type="button" class="button button-primary">ส่ง</button></div>');
    o.querySelector("h3").textContent = t.title || "รายละเอียดงาน";
    o.querySelector(".tk-desc").textContent = t.description || "";
    const cBox = o.querySelector(".tk-comments"), fBox = o.querySelector(".tk-files"), ta = o.querySelector("textarea"), file = o.querySelector('input[type="file"]');

    async function loadC() {
      try {
        const d = await api("/tickets/" + id + "/comments");
        cBox.innerHTML = "";
        if (!d.comments.length) { cBox.innerHTML = '<div class="empty-state">ยังไม่มีความคิดเห็น เริ่มสนทนาได้เลย</div>'; return; }
        d.comments.forEach((c) => {
          const m = document.createElement("div");
          m.className = "cm" + (state.user && Number(c.user_id) === Number(state.user.id) ? " me" : "");
          m.innerHTML = "<b></b><small></small><p></p>";
          m.children[0].textContent = c.user_name + " (" + (roleTh[c.role] || c.role) + ")";
          m.children[1].textContent = fmt(c.created_at);
          m.children[2].textContent = c.body;
          cBox.appendChild(m);
        });
        cBox.scrollTop = cBox.scrollHeight;
      } catch (e) { cBox.innerHTML = '<div class="empty-state"></div>'; cBox.firstChild.textContent = e.message; }
    }
    async function loadF() {
      try {
        const d = await api("/tickets/" + id + "/attachments");
        fBox.innerHTML = d.attachments.length ? "" : '<small style="color:var(--muted)">ยังไม่มีรูปแนบ</small>';
        d.attachments.forEach((a) => {
          const l = document.createElement("a"), i = document.createElement("img");
          l.href = "/api/attachments/" + Number(a.id) + "/file"; l.target = "_blank"; l.rel = "noopener";
          i.src = l.href; i.loading = "lazy"; i.alt = a.original_name; l.title = a.original_name;
          l.appendChild(i); fBox.appendChild(l);
        });
      } catch (e) { fBox.textContent = e.message; }
    }
    o.querySelector(".tk-form .button").addEventListener("click", async () => {
      const body = ta.value.trim();
      if (!body) return;
      try { await api("/tickets/" + id + "/comments", { method: "POST", body: JSON.stringify({ body }) }); ta.value = ""; loadC(); }
      catch (e) { toast(e.message, true); }
    });
    file.addEventListener("change", async () => {
      if (!file.files[0]) return;
      const fd = new FormData(); fd.append("file", file.files[0]);
      try {
        const r = await fetch("/api/tickets/" + id + "/attachments", { method: "POST", body: fd, credentials: "same-origin" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || "อัปโหลดไม่สำเร็จ");
        toast("แนบรูปสำเร็จ"); loadF();
      } catch (e) { toast(e.message, true); }
      file.value = "";
    });
    loadC(); loadF();
  }

  // การแจ้งเตือน
  async function loadNotifs(show) {
    if ($("#app-view")?.classList.contains("hidden")) return;
    try {
      const d = await api("/notifications");
      const b = $("#bell-badge");
      b.textContent = d.unread > 99 ? "99+" : d.unread; b.classList.toggle("hidden", !d.unread);
      if (!show) return;
      const p = $("#bell-panel");
      p.innerHTML = '<div class="bell-head">การแจ้งเตือน</div>';
      if (!d.notifications.length) p.insertAdjacentHTML("beforeend", '<div class="empty-state">ยังไม่มีการแจ้งเตือน</div>');
      d.notifications.forEach((n) => {
        const x = document.createElement("button");
        x.type = "button"; x.className = "notif" + (n.is_read ? "" : " un");
        x.innerHTML = "<span></span><small></small>";
        x.firstChild.textContent = n.message; x.lastChild.textContent = fmt(n.created_at);
        x.onclick = () => { p.classList.add("hidden"); if (n.ticket_id) openTicket(n.ticket_id); };
        p.appendChild(x);
      });
      if (d.unread) { api("/notifications/read-all", { method: "POST" }).then(() => b.classList.add("hidden")).catch(() => {}); }
    } catch (e) { /* ข้ามเมื่อยังไม่ได้เข้าสู่ระบบ */ }
  }

  // โปรไฟล์
  function openProfile() {
    if (typeof state === "undefined" || !state.user) return;
    const { o, close } = modal('<div class="tk-head"><h3>โปรไฟล์ของฉัน</h3><button type="button" class="action-button" data-x>ปิด ✕</button></div>' +
      '<div class="pf-sec"><label>อีเมล</label><input id="pf-email" disabled><label for="pf-name">ชื่อที่แสดง</label><input id="pf-name" maxlength="100"><button type="button" class="button button-primary full-width" id="pf-save">บันทึกชื่อ</button></div>' +
      '<div class="pf-sec"><label for="pf-cur">รหัสผ่านปัจจุบัน</label><input id="pf-cur" type="password" autocomplete="current-password"><label for="pf-new">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label><input id="pf-new" type="password" autocomplete="new-password"><button type="button" class="button button-light full-width" id="pf-pw">เปลี่ยนรหัสผ่าน</button></div>');
    o.querySelector("#pf-email").value = state.user.email || "";
    o.querySelector("#pf-name").value = state.user.name || "";
    o.querySelector("#pf-save").onclick = async () => {
      try {
        const d = await api("/auth/profile", { method: "PATCH", body: JSON.stringify({ name: o.querySelector("#pf-name").value }) });
        state.user.name = d.user.name;
        $("#user-name").textContent = d.user.name; $("#user-avatar").textContent = d.user.name.charAt(0).toUpperCase();
        $("#welcome-title").textContent = "ยินดีต้อนรับ " + d.user.name;
        toast("บันทึกโปรไฟล์สำเร็จ"); close();
      } catch (e) { toast(e.message, true); }
    };
    o.querySelector("#pf-pw").onclick = async () => {
      try {
        await api("/auth/password", { method: "PATCH", body: JSON.stringify({ current_password: o.querySelector("#pf-cur").value, new_password: o.querySelector("#pf-new").value }) });
        toast("เปลี่ยนรหัสผ่านสำเร็จ"); close();
      } catch (e) { toast(e.message, true); }
    };
  }

  // ฉีดปุ่มเข้าตารางที่ script.js วาดไว้
  function inject() {
    document.querySelectorAll("#tickets-list tbody tr, #recent-tickets tbody tr, #assigned-list tbody tr").forEach((tr) => {
      if (tr.querySelector("[data-open-ticket]")) return;
      const id = (tr.firstElementChild?.textContent || "").replace("#", "").trim();
      if (!/^\d+$/.test(id)) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "action-button"; b.dataset.openTicket = id; b.textContent = "💬 รายละเอียด";
      tr.lastElementChild.appendChild(b);
    });
    document.querySelectorAll("#users-list tbody tr").forEach((tr) => {
      if (tr.querySelector("[data-reset-user]")) return;
      const id = (tr.firstElementChild?.textContent || "").trim();
      if (!/^\d+$/.test(id)) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "action-button"; b.dataset.resetUser = id; b.textContent = "รีเซ็ตรหัสผ่าน";
      tr.lastElementChild.appendChild(b);
    });
  }

  addEventListener("DOMContentLoaded", () => {
    const mo = new MutationObserver(inject);
    ["#tickets-list", "#recent-tickets", "#assigned-list", "#users-list"].forEach((s) => { const el = $(s); if (el) mo.observe(el, { childList: true }); });
    document.querySelector(".profile")?.querySelectorAll(".avatar, .profile-info").forEach((el) => { el.classList.add("profile-id"); el.title = "โปรไฟล์ของฉัน"; el.addEventListener("click", openProfile); });
    document.addEventListener("click", async (e) => {
      const ot = e.target.closest("[data-open-ticket]"), ru = e.target.closest("[data-reset-user]"), bell = e.target.closest("#bell-btn");
      if (ot) openTicket(ot.dataset.openTicket);
      if (ru) {
        const pw = await uiPrompt("ตั้งรหัสผ่านใหม่ให้ผู้ใช้ #" + ru.dataset.resetUser + " (อย่างน้อย 8 ตัวอักษร)", "");
        if (pw === null) return;
        try { await api("/admin/users/" + encodeURIComponent(ru.dataset.resetUser) + "/password", { method: "PATCH", body: JSON.stringify({ new_password: pw }) }); toast("รีเซ็ตรหัสผ่านสำเร็จ"); }
        catch (err) { toast(err.message, true); }
      }
      const p = $("#bell-panel");
      if (bell) { if (p.classList.contains("hidden")) { p.classList.remove("hidden"); loadNotifs(true); } else p.classList.add("hidden"); }
      else if (p && !e.target.closest("#bell-panel")) p.classList.add("hidden");
    });
    const av = $("#app-view");
    if (av) new MutationObserver(() => loadNotifs(false)).observe(av, { attributes: true, attributeFilter: ["class"] });
    setInterval(() => loadNotifs(false), 30000);
    setTimeout(() => loadNotifs(false), 2000);
  });
})();

// กราฟแนวโน้ม Ticket รายวัน
(() => {
  let range = 14, timer, lastW = 0;
  const key = (d) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const L = () => (window.LANG === "en" ? ["Total in range", "Daily average", "Busiest day"] : ["รวมช่วงนี้", "เฉลี่ยต่อวัน", "วันที่งานเข้ามากสุด"]);
  function draw() {
    const svg = document.getElementById("trend-svg");
    if (!svg || typeof state === "undefined") return;
    const W = Math.max(Math.round(svg.getBoundingClientRect().width) || 720, 320), H = W < 560 ? 230 : 270;
    lastW = W;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = range - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push({ d, k: key(d), c: 0, r: 0 }); }
    const idx = Object.fromEntries(days.map((x, i) => [x.k, i]));
    (state.tickets || []).forEach((t) => {
      const c = new Date(t.created_at);
      if (!Number.isNaN(c.getTime()) && idx[key(c)] !== undefined) days[idx[key(c)]].c++;
      if (["resolved", "completed"].includes(t.status)) {
        const u = new Date(t.updated_at);
        if (!Number.isNaN(u.getTime()) && idx[key(u)] !== undefined) days[idx[key(u)]].r++;
      }
    });
    const l = 40, r = 20, tp = 16, b = 32;
    const mx = Math.max(2, ...days.map((x) => Math.max(x.c, x.r))), step = Math.ceil(mx / 4), top = step * 4;
    const X = (i) => l + (i * (W - l - r)) / Math.max(range - 1, 1), Y = (v) => tp + (H - tp - b) * (1 - v / top);
    const f = (n) => n.toFixed(1);
    let g = '<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19c3ab" stop-opacity=".38"/><stop offset="1" stop-color="#19c3ab" stop-opacity="0"/></linearGradient></defs>';
    for (let i = 0; i <= 4; i++) g += '<line class="grid" x1="' + l + '" x2="' + (W - r) + '" y1="' + f(Y(step * i)) + '" y2="' + f(Y(step * i)) + '"/><text x="' + (l - 10) + '" y="' + f(Y(step * i) + 3.5) + '" text-anchor="end">' + step * i + "</text>";
    const gap = Math.max(1, Math.ceil(range / (W < 560 ? 5 : 8)));
    days.forEach((x, i) => { if ((range - 1 - i) % gap === 0) g += '<text x="' + f(X(i)) + '" y="' + (H - 9) + '" text-anchor="middle">' + x.d.getDate() + "/" + (x.d.getMonth() + 1) + "</text>"; });
    const smooth = (k) => days.map((x, i) => {
      const px = X(i), py = Y(x[k]);
      if (!i) return "M" + f(px) + "," + f(py);
      const qx = X(i - 1), qy = Y(days[i - 1][k]), m = (qx + px) / 2;
      return "C" + f(m) + "," + f(qy) + " " + f(m) + "," + f(py) + " " + f(px) + "," + f(py);
    }).join(" ");
    const area = smooth("c") + " L" + f(X(range - 1)) + "," + f(Y(0)) + " L" + f(X(0)) + "," + f(Y(0)) + " Z";
    const loc = window.LANG === "en" ? "en-GB" : "th-TH";
    const dots = (k, cls) => days.map((x, i) => (x[k] ? '<circle class="' + cls + '" cx="' + f(X(i)) + '" cy="' + f(Y(x[k])) + '" r="4"><title>' + x.d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + ": " + x[k] + "</title></circle>" : "")).join("");
    svg.innerHTML = g + '<path class="area" d="' + area + '"/><path class="tl-c line-draw" pathLength="1" d="' + smooth("c") + '"/><path class="tl-r line-draw" pathLength="1" d="' + smooth("r") + '"/>' + dots("c", "dc") + dots("r", "dr");
    const tot = days.reduce((s, x) => s + x.c, 0), peak = days.reduce((p, x) => (x.c > p.c ? x : p), days[0]), t = L();
    document.getElementById("trend-sum").innerHTML = "<div>" + t[0] + "<b>" + tot + "</b></div><div>" + t[1] + "<b>" + (tot / range).toFixed(1) + "</b></div><div>" + t[2] +
      "<b>" + (peak.c ? peak.d.getDate() + "/" + (peak.d.getMonth() + 1) + " (" + peak.c + ")" : "-") + "</b></div>";
  }
  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-range]").forEach((btn) => btn.addEventListener("click", () => {
      range = Number(btn.dataset.range);
      document.querySelectorAll("[data-range]").forEach((x) => x.classList.toggle("on", x === btn));
      draw();
    }));
    const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(draw, 200); });
    ["#stat-total", "#stat-open", "#stat-progress", "#stat-resolved"].forEach((s) => { const el = document.querySelector(s); if (el) obs.observe(el, { childList: true, characterData: true, subtree: true }); });
    document.getElementById("lang-toggle")?.addEventListener("click", () => setTimeout(draw, 300));
    const svg = document.getElementById("trend-svg");
    if (svg && window.ResizeObserver) new ResizeObserver(() => { if (Math.abs(svg.getBoundingClientRect().width - lastW) > 8) { clearTimeout(timer); timer = setTimeout(draw, 120); } }).observe(svg);
    draw();
  });
})();
