const API = "/api";

const state = {
  user: null,
  tickets: [],
  categories: [],
  users: [],
  technicianRatings: [],
  page: "dashboard"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimer;

function showToast(message, isError = false) {
  let toast = $("#toast-message");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message";
    toast.className = "toast-message";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `เกิดข้อผิดพลาด (${response.status})`
    );
  }

  return data;
}

function showMessage(element, text, type = "error") {
  const node = typeof element === "string" ? $(element) : element;
  if (!node) return;

  if (
    node.id === "global-message" ||
    node.id === "category-form-message"
  ) {
    showToast(text, type !== "success");
    return;
  }

  node.textContent = text;
  node.className = `message ${type}`;
}

function ensureReviewModal() {
  if ($("#review-ticket-modal")) return;

  const modal = document.createElement("div");
  modal.id = "review-ticket-modal";
  modal.className = "hidden";

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10001;
    background: rgba(15, 23, 42, 0.68);
    padding: 16px;
    display: none;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      color: #1e293b;
      width: 100%;
      max-width: 480px;
      border-radius: 16px;
      padding: 24px;
      box-sizing: border-box;
      box-shadow: 0 20px 50px rgba(0,0,0,.2);
    ">
      <h2 style="margin-top: 0;">รีวิวการให้บริการช่าง</h2>

      <p id="review-ticket-subtitle"
         style="color: #64748b;"></p>

      <form id="review-ticket-form">
        <label for="review-rating">
          คะแนนการให้บริการ (1–5 ดาว)
        </label>

        <select
          id="review-rating"
          required
          style="
            display: block;
            width: 100%;
            padding: 10px;
            margin: 8px 0 16px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          "
        >
          <option value="">เลือกคะแนน</option>
          <option value="5">5 ดาว — ดีมาก</option>
          <option value="4">4 ดาว — ดี</option>
          <option value="3">3 ดาว — ปานกลาง</option>
          <option value="2">2 ดาว — ควรปรับปรุง</option>
          <option value="1">1 ดาว — ต้องปรับปรุงมาก</option>
        </select>

        <label for="review-comment">
          ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
        </label>

        <textarea
          id="review-comment"
          maxlength="2000"
          rows="4"
          placeholder="เขียนความคิดเห็นเกี่ยวกับการให้บริการ..."
          style="
            display: block;
            width: 100%;
            padding: 10px;
            margin: 8px 0 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            box-sizing: border-box;
            resize: vertical;
          "
        ></textarea>

        <p id="review-ticket-message"
           role="alert"
           style="color: #dc2626;"></p>

        <div style="
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        ">
          <button
            type="button"
            class="action-button"
            data-close-review
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            class="action-button"
            id="review-ticket-submit"
          >
            ส่งรีวิว
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.closest("[data-close-review]")
    ) {
      closeReviewModal();
    }
  });

  $("#review-ticket-form").addEventListener(
    "submit",
    submitTicketReview
  );
}

function closeReviewModal() {
  const modal = $("#review-ticket-modal");

  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function openReviewModal(ticketId) {
  ensureReviewModal();

  const ticket = state.tickets.find(
    item => String(item.id) === String(ticketId)
  );

  if (!ticket) {
    showToast("ไม่พบรายการแจ้งปัญหานี้", true);
    return;
  }

  if (ticket.status !== "resolved") {
    showToast("สามารถรีวิวได้เมื่อช่างแก้ไขปัญหาแล้ว", true);
    return;
  }

  const technicianId =
    ticket.technician_id ?? ticket.technicianId;

  if (!technicianId) {
    showToast("รายการนี้ยังไม่มีช่างผู้รับผิดชอบ", true);
    return;
  }

  const modal = $("#review-ticket-modal");

  $("#review-ticket-subtitle").textContent =
    `รายการ #${ticket.id}: ${ticket.title || "แจ้งปัญหา"}`;

  $("#review-rating").value = "";
  $("#review-comment").value = "";
  $("#review-ticket-message").textContent = "";

  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

async function submitTicketReview(event) {
  event.preventDefault();

  const message = $("#review-ticket-message");
  const submitButton = $("#review-ticket-submit");
  const ticketIdText = $("#review-ticket-subtitle").textContent;
  const match = ticketIdText.match(/รายการ #(\d+)/);

  if (!match) {
    message.textContent = "ไม่พบหมายเลขรายการแจ้งปัญหา";
    return;
  }

  const ticketId = match[1];
  const rating = Number($("#review-rating").value);
  const comment = $("#review-comment").value.trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    message.textContent = "กรุณาเลือกคะแนนตั้งแต่ 1–5 ดาว";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "กำลังส่ง...";

  try {
    await api(`/tickets/${ticketId}/review`, {
      method: "POST",
      body: JSON.stringify({
        rating,
        comment
      })
    });

    showToast("ส่งรีวิวเรียบร้อยแล้ว", false);
    closeReviewModal();

    await loadTechnicianRatings();

    if (typeof renderDashboard === "function") {
      renderDashboard();
    } else if (typeof renderTickets === "function") {
      renderTickets("#tickets-list", state.tickets);
    }
  } catch (error) {
    message.textContent = error.message || "ส่งรีวิวไม่สำเร็จ";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ส่งรีวิว";
  }
}
function clearMessage(element) {
  const node = typeof element === "string" ? $(element) : element;

  if (node) {
    node.textContent = "";
    node.className = "message hidden";
  }
}

function roleName(role) {
  return ({
    admin: "ผู้ดูแลระบบ",
    technician: "ช่างเทคนิค",
    user: "ผู้ใช้งาน"
  })[role] || role || "ผู้ใช้งาน";
}

function statusName(status) {
  return ({
    open: "รอดำเนินการ",
    pending: "รอดำเนินการ",
    assigned: "มอบหมายแล้ว",
    in_progress: "กำลังดำเนินการ",
    resolved: "แก้ไขแล้ว",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก"
  })[status] || status || "ไม่ระบุ";
}

function statusClass(status) {
  return `status-${String(status || "").toLowerCase().replace(/\s+/g, "_")}`;
}

function priorityName(priority) {
  return ({
    low: "ต่ำ",
    medium: "ปานกลาง",
    high: "สูง",
    urgent: "เร่งด่วน"
  })[priority] || priority || "ไม่ระบุ";
}

function isAdmin() {
  return state.user?.role === "admin";
}

function isTechnician() {
  return state.user?.role === "technician";
}

function showLogin() {
  $("#login-view")?.classList.remove("hidden");
  $("#app-view")?.classList.add("hidden");
  $("#logout-button")?.classList.add("hidden");

  if ($("#user-name")) {
    $("#user-name").textContent = "ผู้ใช้งาน";
  }

  if ($("#user-role")) {
    $("#user-role").textContent = "ยังไม่ได้เข้าสู่ระบบ";
  }
}

function showApplication() {
  $("#login-view")?.classList.add("hidden");
  $("#app-view")?.classList.remove("hidden");
  $("#logout-button")?.classList.remove("hidden");

  $("#user-name").textContent =
    state.user.name || state.user.email || "ผู้ใช้งาน";

  $("#user-role").textContent = roleName(state.user.role);

  $("#user-avatar").textContent =
    (state.user.name || state.user.email || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  $$(".role-admin").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin());
  });

  $$(".role-technician").forEach((el) => {
    el.classList.toggle("hidden", !isTechnician());
  });

  $("#welcome-title").textContent =
    `ยินดีต้อนรับ ${state.user.name || ""}`;
}



async function login(event) {
  event.preventDefault();

  const email = ($("#email")?.value || "").trim();
  const password = $("#password")?.value || "";

  if (!email && !password.trim()) {
    await uiAlert("กรุณากรอกอีเมลและรหัสผ่าน");
    $("#email")?.focus();
    return;
  }

  if (!email) {
    await uiAlert("กรุณากรอกอีเมล");
    $("#email")?.focus();
    return;
  }

  if (!password.trim()) {
    await uiAlert("กรุณากรอกรหัสผ่าน");
    $("#password")?.focus();
    return;
  }

  clearMessage("#login-message");

  try {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    await loadCurrentUser();
    await openPage("dashboard");
  } catch (error) {
    await uiAlert(error.message || "เข้าสู่ระบบไม่สำเร็จ");
    showMessage("#login-message", error.message || "เข้าสู่ระบบไม่สำเร็จ");
  }
}
function showRegister() {
  $("#login-panel")?.classList.add("hidden");
  $("#register-view")?.classList.remove("hidden");
  clearMessage("#register-message");
  $("#register-name")?.focus();
}

function backToLogin() {
  $("#register-view")?.classList.add("hidden");
  $("#login-panel")?.classList.remove("hidden");

  clearMessage("#register-message");
  clearMessage("#login-message");

  $("#email")?.focus();
}

async function register(event) {
  event.preventDefault();

  const name = ($("#register-name")?.value || "").trim();
  const email = ($("#register-email")?.value || "").trim();
  const password = $("#register-password")?.value || "";
  const confirmPassword =
    $("#register-confirm-password")?.value || "";

  clearMessage("#register-message");

  if (!name || !email || !password || !confirmPassword) {
    showMessage(
      "#register-message",
      "กรุณากรอกข้อมูลให้ครบทุกช่อง"
    );
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage(
      "#register-message",
      "กรุณากรอกอีเมลให้ถูกต้อง"
    );
    return;
  }

  if (password.length < 8) {
    showMessage(
      "#register-message",
      "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
    );
    return;
  }

  if (password !== confirmPassword) {
    showMessage(
      "#register-message",
      "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน"
    );
    return;
  }

  try {
    const result = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    await uiAlert(result.message || "สมัครสมาชิกสำเร็จ");

    $("#email").value = email;
    $("#password").value = "";

    $("#register-form")?.reset();

    backToLogin();
    $("#password")?.focus();
  } catch (error) {
    showMessage(
      "#register-message",
      error.message || "สมัครสมาชิกไม่สำเร็จ"
    );
  }
}



async function loadCurrentUser() {
  const data = await api("/auth/me");
  state.user = data.user || data;
  showApplication();
}

async function logout() {
  closeHistoryModal();
  closeEditTicketModal();

  try {
    await api("/auth/logout", { method: "POST" });
  } catch (error) {
    console.warn("Logout request:", error.message);
  }

  state.user = null;
  state.tickets = [];
  state.categories = [];
  state.users = [];

  showLogin();
}

function setActivePage(page) {
  state.page = page;

  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $$(".page-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });

  $(`#${page}-page`)?.classList.remove("hidden");

  const labels = {
    dashboard: ["ภาพรวมระบบ", "สรุปข้อมูลการแจ้งปัญหา IT ของคุณ"],
    tickets: ["รายการแจ้งปัญหา", "ตรวจสอบ Ticket และติดตามสถานะ"],
    "create-ticket": ["แจ้งปัญหาใหม่", "ส่งรายละเอียดปัญหาให้ทีม IT"],
    users: ["จัดการผู้ใช้", "ดูบัญชีและบทบาทของผู้ใช้งาน"],
    categories: ["หมวดหมู่ปัญหา", "จัดการหมวดหมู่สำหรับ Ticket"],
    assigned: ["งานที่ได้รับมอบหมาย", "จัดการ Ticket ที่ได้รับมอบหมาย"],
    faq: ["ศูนย์ช่วยเหลือ", "คำตอบสำหรับปัญหาที่พบบ่อย"]
  };

  const label = labels[page] || labels.dashboard;

  $("#page-title").textContent = label[0];
  $("#page-description").textContent = label[1];
  $("#breadcrumb-page").textContent = label[0];
  $("#sidebar").classList.remove("open");
}

async function openPage(page) {
  if (page === "users" && !isAdmin()) page = "dashboard";
  if (page === "categories" && !isAdmin()) page = "dashboard";
  if (page === "assigned" && !isTechnician()) page = "dashboard";

  setActivePage(page);
  clearMessage("#global-message");

  try {
    if (page === "dashboard") {
      await loadTickets();
      if (isAdmin()) await loadTechnicianRatings();
      renderDashboard();
    } else if (page === "tickets") {
      await loadTickets();

      if (isAdmin()) {
        await loadUsers();
      }

      renderTickets("#tickets-list", state.tickets);
    } else if (page === "create-ticket") {
      await loadCategories();
    } else if (page === "categories") {
      await loadCategories();
      renderCategories();
    } else if (page === "users") {
      await loadUsers();
      renderUsers();
    } else if (page === "assigned") {
      await loadAssignedTickets();
    }
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

async function loadTickets() {
  let data;

  if (isAdmin()) {
    data = await api("/admin/tickets");
  } else if (isTechnician()) {
    data = await api("/technician/tickets");
  } else {
    data = await api("/tickets/my");
  }

  state.tickets = Array.isArray(data)
    ? data
    : (data.tickets || data.data || []);
}

async function loadTechnicianRatings() {
  try {
    const data = await api("/technicians/ratings");

    state.technicianRatings = Array.isArray(data.ratings)
      ? data.ratings
      : [];
  } catch (error) {
    console.error("โหลดคะแนนช่างไม่สำเร็จ:", error.message);
    state.technicianRatings = [];
  }
}

function formatTechnicianRating(technicianId) {
  const technician = state.technicianRatings.find(
    item => String(item.technician_id) === String(technicianId)
  );

  if (!technician || Number(technician.review_count) === 0) {
    return "ยังไม่มีคะแนน";
  }

  return `⭐ ${Number(technician.average_rating).toFixed(1)} (${technician.review_count} รีวิว)`;
}

function renderTechnicianRatings() {
  const container = $("#technician-ratings-list");
  if (!container) return;

  const ratings = state.technicianRatings || [];

  if (ratings.length === 0) {
    container.innerHTML =
      '<div class="empty-state">ยังไม่มีข้อมูลช่างในระบบ</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ชื่อช่าง</th>
          <th>คะแนนเฉลี่ย</th>
          <th>จำนวนรีวิว</th>
        </tr>
      </thead>
      <tbody>
        ${ratings.map((item) => {
          const count = Number(item.review_count) || 0;
          const average = Number(item.average_rating) || 0;

          return `
            <tr>
              <td><strong>${escapeHTML(item.technician_name || "-")}</strong></td>
              <td>
                ${count > 0
                  ? `⭐ ${average.toFixed(1)} / 5`
                  : "ยังไม่มีคะแนน"}
              </td>
              <td>${count} รีวิว</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}



async function loadCategories() {
  const data = await api("/categories");

  state.categories = Array.isArray(data)
    ? data
    : (data.categories || data.data || []);

  const select = $("#ticket-category");

  if (select) {
    const previous = select.value;

    select.innerHTML =
      '<option value="">เลือกหมวดหมู่</option>' +
      state.categories.map((category) => `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(category.name)}
        </option>
      `).join("");

    if (
      state.categories.some(
        (category) => String(category.id) === previous
      )
    ) {
      select.value = previous;
    }
  }
}

function renderDashboard() {
  const tickets = state.tickets;

  $("#stat-total").textContent = tickets.length;

  $("#stat-open").textContent = tickets.filter((ticket) =>
    ["open", "pending", "assigned"].includes(ticket.status)
  ).length;

  $("#stat-progress").textContent = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;

  $("#stat-resolved").textContent = tickets.filter((ticket) =>
    ["resolved", "completed"].includes(ticket.status)
  ).length;

  renderTickets("#recent-tickets", tickets.slice(0, 5));
    if (isAdmin()) {
    renderTechnicianRatings();
  }
}

function renderTickets(target, tickets) {
  const container = $(target);
  if (!container) return;

  if (!tickets.length) {
    container.innerHTML =
      '<div class="empty-state">ยังไม่มีรายการแจ้งปัญหา</div>';
    return;
  }

  const canAssign = isAdmin() && target === "#tickets-list";
  const showEdit = target !== "#recent-tickets";
  const showReview = !isAdmin() && !isTechnician();

  const technicians = state.users.filter(
    (user) => user.role === "technician"
  );

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>เลขที่</th>
          <th>หัวข้อ</th>
          <th>หมวดหมู่</th>
          <th>ความสำคัญ</th>
          <th>สถานะ</th>
          <th>อายุงาน</th>
          ${canAssign ? "<th>ผู้รับผิดชอบ</th><th>จัดการ</th>" : ""}
          ${showEdit ? "<th>แก้ไข</th>" : ""}
          ${showReview ? "<th>รีวิวช่าง</th>" : ""}
          <th>รายละเอียด</th>
        </tr>
      </thead>

      <tbody>
        ${tickets.map((ticket) => {
          const techId =
            ticket.technician_id ??
            ticket.technicianId ??
            "";

          const techName =
            ticket.technician_name ??
            ticket.technician ??
            "";

          return `
            <tr>
              <td>#${escapeHTML(ticket.id)}</td>

              <td>
                <strong>${escapeHTML(ticket.title)}</strong>
              </td>

              <td>
                ${escapeHTML(ticket.category_name || ticket.category || "-")}
              </td>

              <td>${escapeHTML(priorityName(ticket.priority))}</td>

              <td>
                <span class="status-pill ${statusClass(ticket.status)}">
                  ${escapeHTML(statusName(ticket.status))}
                </span>
              </td>
              <td>${slaCell(ticket)}</td>

              ${canAssign ? `
                <td>
                  <select
                    data-assign-technician="${escapeHTML(ticket.id)}"
                    aria-label="เลือกช่างสำหรับ Ticket ${escapeHTML(ticket.id)}"
                  >
                    <option value="">เลือก Technician</option>

                    ${technicians.map((technician) => `
                      <option
                        value="${escapeHTML(technician.id)}"
                        ${String(technician.id) === String(techId)
                          ? "selected"
                          : ""}
                      >
                        ${escapeHTML(technician.name || technician.email)} (งานค้าง ${state.tickets.filter((x) => String(x.technician_id) === String(technician.id) && !["resolved", "completed", "cancelled"].includes(x.status)).length})
                      </option>
                    `).join("")}
                  </select>

                  ${techName && !techId ? `
                    <small>
                      ผู้รับผิดชอบปัจจุบัน:
                      ${escapeHTML(techName)}
                    </small>
                  ` : ""}

                  ${technicians.length === 0 ? `
                    <small>ยังไม่มีบัญชี Technician</small>
                  ` : ""}
                </td>

                <td>
                  <button
                    type="button"
                    class="action-button"
                    data-assign-ticket="${escapeHTML(ticket.id)}"
                    ${technicians.length === 0 ? "disabled" : ""}
                  >
                    มอบหมายงาน
                  </button>
                </td>
              ` : ""}

              ${showEdit ? `
                <td>
                  <button
                    type="button"
                    class="action-button"
                    data-edit-ticket="${escapeHTML(ticket.id)}"
                  >
                    แก้ไข
                  </button>
                </td>
              ` : ""}

              
              ${showReview ? `
                <td>
                  ${
                    ticket.status === "resolved" &&
                    (ticket.technician_id ?? ticket.technicianId)
                      ? `
                        <button
                          type="button"
                          class="action-button"
                          data-review-ticket="${escapeHTML(ticket.id)}"
                        >
                          รีวิวช่าง
                        </button>

                        <div style="font-size: .85rem; margin-top: 5px; color: #64748b;">
                          ${escapeHTML(formatTechnicianRating(
                            ticket.technician_id ?? ticket.technicianId
                          ))}
                        </div>
                      `
                      : "รีวิวได้เมื่อแก้ไขแล้ว"
                  }
                </td>
              ` : ""}

              <td>
                <button
                  type="button"
                  class="action-button"
                  data-view-history="${escapeHTML(ticket.id)}"
                >
                  ดูประวัติ
                </button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function assignTicket(id) {
  const select = $(
    `[data-assign-technician="${CSS.escape(String(id))}"]`
  );

  if (!select) return;

  const technicianId = select.value;

  if (!technicianId) {
    showMessage(
      "#global-message",
      "กรุณาเลือก Technician ก่อนมอบหมายงาน"
    );
    return;
  }

  const technician = state.users.find(
    (user) => String(user.id) === String(technicianId)
  );

  if (!technician || technician.role !== "technician") {
    showMessage(
      "#global-message",
      "บัญชีที่เลือกไม่ใช่ Technician กรุณาเลือกใหม่"
    );
    return;
  }

  if (!await uiConfirm(
    `ยืนยันมอบหมาย Ticket #${id} ให้ ${technician.name || technician.email} หรือไม่?`
  )) {
    return;
  }

  try {
    await api(`/admin/tickets/${encodeURIComponent(id)}/assign`, {
      method: "PATCH",
      body: JSON.stringify({
        technician_id: Number(technicianId)
      })
    });

    showMessage(
      "#global-message",
      `มอบหมาย Ticket #${id} ให้ ${technician.name || technician.email} แล้ว`,
      "success"
    );

    await loadTickets();
    await loadUsers();
    renderTickets("#tickets-list", state.tickets);
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

/* ========================================
   แก้ไข Ticket
======================================== */

function ensureEditTicketModal() {
  if ($("#edit-ticket-modal")) return;

  const modal = document.createElement("div");
  modal.id = "edit-ticket-modal";
  modal.className = "hidden";

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(15, 23, 42, 0.68);
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;

  modal.innerHTML = `
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-ticket-heading"
      style="
        background: #fff;
        color: #1f2937;
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 16px;
        padding: 22px;
        box-sizing: border-box;
        box-shadow: 0 15px 40px rgba(0,0,0,.25);
      "
    >
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      ">
        <h2 id="edit-ticket-heading" style="margin: 0">
          แก้ไข Ticket
        </h2>

        <button
          type="button"
          data-close-edit-ticket
          aria-label="ปิดหน้าต่างแก้ไข"
          style="
            border: 0;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
          "
        >
          ปิด ✕
        </button>
      </div>

      <p id="edit-ticket-subtitle" style="color: #64748b"></p>

      <form id="edit-ticket-form">
        <label
          for="edit-ticket-title-input"
          style="display: block; font-weight: 600; margin: 12px 0 6px"
        >
          หัวข้อปัญหา
        </label>

        <input
          id="edit-ticket-title-input"
          name="title"
          required
          maxlength="255"
          style="
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          "
        >

        <label
          for="edit-ticket-description"
          style="display: block; font-weight: 600; margin: 12px 0 6px"
        >
          รายละเอียด
        </label>

        <textarea
          id="edit-ticket-description"
          name="description"
          required
          rows="5"
          style="
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            resize: vertical;
          "
        ></textarea>

        <label
          for="edit-ticket-category"
          style="display: block; font-weight: 600; margin: 12px 0 6px"
        >
          หมวดหมู่
        </label>

        <select
          id="edit-ticket-category"
          name="category_id"
          required
          style="
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          "
        ></select>

        <label
          for="edit-ticket-priority"
          style="display: block; font-weight: 600; margin: 12px 0 6px"
        >
          ความสำคัญ
        </label>

        <select
          id="edit-ticket-priority"
          name="priority"
          required
          style="
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          "
        >
          <option value="low">ต่ำ</option>
          <option value="medium">ปานกลาง</option>
          <option value="high">สูง</option>
          <option value="urgent">เร่งด่วน</option>
        </select>

        <p
          id="edit-ticket-message"
          role="alert"
          style="color: #b91c1c; min-height: 1.2em"
        ></p>

        <div style="
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        ">
          <button
            type="button"
            data-close-edit-ticket
            style="
              padding: 10px 16px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #fff;
              cursor: pointer;
            "
          >
            ยกเลิก
          </button>

          <button
            id="edit-ticket-submit"
            type="submit"
            style="
              padding: 10px 16px;
              border: 0;
              border-radius: 8px;
              background: #2563eb;
              color: white;
              cursor: pointer;
            "
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </form>
    </section>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.closest("[data-close-edit-ticket]")
    ) {
      closeEditTicketModal();
    }
  });

  $("#edit-ticket-form").addEventListener("submit", saveTicketEdits);
}

function closeEditTicketModal() {
  const modal = $("#edit-ticket-modal");

  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

async function editTicket(id) {
  try {
    await loadTickets();
    await loadCategories();

    const ticket = state.tickets.find(
      (item) => String(item.id) === String(id)
    );

    if (!ticket) {
      showMessage(
        "#global-message",
        "ไม่พบ Ticket นี้ หรือคุณไม่มีสิทธิ์เข้าถึง"
      );
      return;
    }

    ensureEditTicketModal();

    $("#edit-ticket-subtitle").textContent = `Ticket #${id}`;
    $("#edit-ticket-form").dataset.ticketId = String(id);

    $("#edit-ticket-title-input").value = ticket.title || "";
    $("#edit-ticket-description").value = ticket.description || "";

    const categorySelect = $("#edit-ticket-category");

    categorySelect.innerHTML =
      '<option value="">เลือกหมวดหมู่</option>' +
      state.categories.map((category) => `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(category.name)}
        </option>
      `).join("");

    categorySelect.value = String(
      ticket.category_id ?? ticket.categoryId ?? ""
    );

    $("#edit-ticket-priority").value = ticket.priority || "medium";
    $("#edit-ticket-message").textContent = "";

    $("#edit-ticket-submit").disabled = false;
    $("#edit-ticket-submit").textContent = "บันทึกการแก้ไข";

    const modal = $("#edit-ticket-modal");
    modal.classList.remove("hidden");
    modal.style.display = "flex";

    $("#edit-ticket-title-input").focus();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

async function saveTicketEdits(event) {
  event.preventDefault();

  const form = $("#edit-ticket-form");
  const id = form.dataset.ticketId;
  const message = $("#edit-ticket-message");
  const submit = $("#edit-ticket-submit");

  const body = {
    title: $("#edit-ticket-title-input").value.trim(),
    description: $("#edit-ticket-description").value.trim(),
    category_id: Number($("#edit-ticket-category").value),
    priority: $("#edit-ticket-priority").value
  };

  if (!body.title || !body.description) {
    message.textContent = "กรุณากรอกหัวข้อและรายละเอียดให้ครบ";
    return;
  }

  if (!body.category_id) {
    message.textContent = "กรุณาเลือกหมวดหมู่";
    return;
  }

  if (!["low", "medium", "high", "urgent"].includes(body.priority)) {
    message.textContent = "กรุณาเลือกระดับความสำคัญที่ถูกต้อง";
    return;
  }

  submit.disabled = true;
  submit.textContent = "กำลังบันทึก...";
  message.textContent = "";

  try {
    await api(`/tickets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });

    closeEditTicketModal();

    showMessage(
      "#global-message",
      `แก้ไข Ticket #${id} สำเร็จ`,
      "success"
    );

    await openPage(state.page);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
    submit.textContent = "บันทึกการแก้ไข";
  }
}

/* ========================================
   ประวัติ Ticket
======================================== */

function ensureHistoryModal() {
  if ($("#ticket-history-modal")) return;

  const modal = document.createElement("div");
  modal.id = "ticket-history-modal";
  modal.className = "hidden";

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.65);
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;

  modal.innerHTML = `
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-history-title"
      style="
        background: white;
        color: #1f2937;
        width: 100%;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        border-radius: 14px;
        padding: 20px;
        box-sizing: border-box;
        box-shadow: 0 15px 40px rgba(0,0,0,.25);
      "
    >
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      ">
        <h2 id="ticket-history-title" style="margin: 0">
          ประวัติ Ticket
        </h2>

        <button
          type="button"
          data-close-history
          aria-label="ปิดหน้าต่างประวัติ"
          style="
            border: 0;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
          "
        >
          ปิด ✕
        </button>
      </div>

      <p id="ticket-history-subtitle" style="color: #64748b"></p>

      <div id="ticket-history-content" aria-live="polite">
        กำลังโหลดประวัติ...
      </div>
    </section>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.closest("[data-close-history]")
    ) {
      closeHistoryModal();
    }
  });
}

function closeHistoryModal() {
  const modal = $("#ticket-history-modal");

  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function formatHistoryDate(value) {
  if (!value) return "ไม่ระบุวันเวลา";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(window.LANG === "en" ? "en-GB" : "th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getHistoryRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.history)) return data.history;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.records)) return data.records;

  return [];
}

function renderHistoryRows(rows) {
  const content = $("#ticket-history-content");

  if (!rows.length) {
    content.innerHTML = `
      <div style="
        padding: 20px;
        text-align: center;
        background: #f8fafc;
        border-radius: 10px;
      ">
        ยังไม่มีประวัติการดำเนินงานสำหรับ Ticket นี้
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px">
      ${rows.map((item) => {
        const actor =
          item.changed_by_name ??
          item.changedByName ??
          item.user_name ??
          item.name ??
          item.changed_by ??
          "ไม่ระบุผู้ดำเนินการ";

        const oldStatus =
          item.old_status ??
          item.oldStatus ??
          item.previous_status ??
          item.previousStatus;

        const newStatus =
          item.new_status ??
          item.newStatus ??
          item.status ??
          item.ticket_status;

        const note =
          item.note ??
          item.description ??
          item.remark ??
          item.message;

        const date =
          item.created_at ??
          item.createdAt ??
          item.changed_at ??
          item.changedAt ??
          item.timestamp;

        let statusText = "";

        if (oldStatus && newStatus) {
          statusText =
            `${statusName(oldStatus)} → ${statusName(newStatus)}`;
        } else if (newStatus) {
          statusText = statusName(newStatus);
        } else {
          statusText =
            item.action ??
            item.activity ??
            item.event ??
            "บันทึกการดำเนินงาน";
        }

        return `
          <article style="
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px;
            overflow-wrap: anywhere;
          ">
            <div style="font-weight: 700; margin-bottom: 6px">
              ${escapeHTML(statusText)}
            </div>

            <div style="margin-bottom: 5px">
              <strong>ผู้ดำเนินการ:</strong>
              ${escapeHTML(actor)}
            </div>

            ${note ? `
              <div style="margin-bottom: 5px">
                <strong>หมายเหตุ:</strong>
                ${escapeHTML(note)}
              </div>
            ` : ""}

            <div style="
              color: #64748b;
              font-size: .9rem;
              margin-top: 8px;
            ">
              ${escapeHTML(formatHistoryDate(date))}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

async function viewTicketHistory(id) {
  ensureHistoryModal();

  const modal = $("#ticket-history-modal");
  const content = $("#ticket-history-content");
  const subtitle = $("#ticket-history-subtitle");

  modal.classList.remove("hidden");
  modal.style.display = "flex";

  $("#ticket-history-title").textContent = `ประวัติ Ticket #${id}`;
  subtitle.textContent = "กำลังโหลดประวัติการดำเนินงาน...";
  content.textContent = "กำลังโหลดประวัติ...";

  try {
    const data = await api(
      `/tickets/${encodeURIComponent(id)}/history`
    );

    subtitle.textContent = `รายการแจ้งปัญหาเลขที่ ${id}`;
    renderHistoryRows(getHistoryRows(data));
  } catch (error) {
    content.innerHTML = `
      <div style="
        padding: 16px;
        background: #fef2f2;
        color: #991b1b;
        border-radius: 10px;
        overflow-wrap: anywhere;
      ">
        <strong>ไม่สามารถโหลดประวัติได้</strong>
        <p style="margin-bottom: 0">${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

/* ========================================
   สร้าง Ticket
======================================== */

async function createTicket(event) {
  event.preventDefault();
  clearMessage("#ticket-form-message");

  const body = {
    title: $("#ticket-title").value.trim(),
    description: $("#ticket-description").value.trim(),
    category_id: Number($("#ticket-category").value),
    priority: $("#ticket-priority").value
  };

  if (!body.category_id) {
    showMessage("#ticket-form-message", "กรุณาเลือกหมวดหมู่ปัญหา");
    return;
  }

  try {
    await api("/tickets", {
      method: "POST",
      body: JSON.stringify(body)
    });

    $("#ticket-form").reset();

    showMessage(
      "#ticket-form-message",
      "ส่งรายการแจ้งปัญหาสำเร็จ",
      "success"
    );

    await loadTickets();
  } catch (error) {
    showMessage("#ticket-form-message", error.message);
  }
}

/* ========================================
   จัดการผู้ใช้
======================================== */

async function loadUsers() {
  const data = await api("/admin/users");

  state.users = Array.isArray(data)
    ? data
    : (data.users || data.data || []);
}

function renderUsers() {
  const container = $("#users-list");
  if (!container) return;

  if (!state.users.length) {
    container.innerHTML =
      '<div class="empty-state">ไม่พบข้อมูลผู้ใช้</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>ชื่อ</th>
          <th>อีเมล</th>
          <th>บทบาท</th>
          <th>จัดการ</th>
        </tr>
      </thead>

      <tbody>
        ${state.users.map((user) => `
          <tr>
            <td>${escapeHTML(user.id)}</td>
            <td>${escapeHTML(user.name)}</td>
            <td>${escapeHTML(user.email)}</td>
            <td>${escapeHTML(roleName(user.role))}</td>

            <td>
              <select
                data-user-role="${escapeHTML(user.id)}"
                aria-label="เปลี่ยนบทบาท"
              >
                <option value="user" ${user.role === "user" ? "selected" : ""}>
                  ผู้ใช้งาน
                </option>

                <option value="technician" ${user.role === "technician" ? "selected" : ""}>
                  ช่างเทคนิค
                </option>

                <option value="admin" ${user.role === "admin" ? "selected" : ""}>
                  ผู้ดูแลระบบ
                </option>
              </select>

              <button
                type="button"
                class="action-button"
                data-save-role="${escapeHTML(user.id)}"
              >
                บันทึก
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function saveUserRole(id) {
  const select = $(
    `[data-user-role="${CSS.escape(String(id))}"]`
  );

  if (!select) return;

  if (!await uiConfirm("ยืนยันเปลี่ยนบทบาทผู้ใช้นี้หรือไม่?")) return;

  try {
    await api(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: select.value })
    });

    showMessage("#global-message", "บันทึกบทบาทผู้ใช้แล้ว", "success");

    await loadUsers();
    renderUsers();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

/* ========================================
   จัดการหมวดหมู่
======================================== */

function renderCategories() {
  const container = $("#categories-list");
  if (!container) return;

  if (!state.categories.length) {
    container.innerHTML =
      '<div class="empty-state">ยังไม่มีหมวดหมู่</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>ชื่อหมวดหมู่</th>
          <th>รายละเอียด</th>
          <th>จัดการ</th>
        </tr>
      </thead>

      <tbody>
        ${state.categories.map((category) => `
          <tr>
            <td>${escapeHTML(category.id)}</td>
            <td>${escapeHTML(category.name)}</td>
            <td>${escapeHTML(category.description || "-")}</td>

            <td>
              <button
                type="button"
                class="action-button"
                data-edit-category="${escapeHTML(category.id)}"
              >
                แก้ไข
              </button>

              <button
                type="button"
                class="action-button"
                data-delete-category="${escapeHTML(category.id)}"
              >
                ลบ
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function addCategory(event) {
  event.preventDefault();

  const name = $("#category-name").value.trim();
  const description = $("#category-description").value.trim();

  try {
    await api("/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name, description })
    });

    $("#category-form").reset();

    showMessage("#global-message", "เพิ่มหมวดหมู่สำเร็จ", "success");

    await loadCategories();
    renderCategories();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

async function editCategory(id) {
  const category = state.categories.find(
    (item) => String(item.id) === String(id)
  );

  if (!category) return;

  const name = await uiPrompt("แก้ไขชื่อหมวดหมู่:", category.name);
  if (name === null) return;

  const description = await uiPrompt(
    "แก้ไขรายละเอียดหมวดหมู่:",
    category.description || ""
  );

  if (description === null) return;

  try {
    await api(`/admin/categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim()
      })
    });

    showMessage("#global-message", "แก้ไขหมวดหมู่สำเร็จ", "success");

    await loadCategories();
    renderCategories();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

async function deleteCategory(id) {
  const category = state.categories.find(
    (item) => String(item.id) === String(id)
  );

  if (!category) return;

  if (!await uiConfirm(`ยืนยันลบหมวดหมู่ "${category.name}" หรือไม่?`)) return;

  try {
    await api(`/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    showMessage("#global-message", "ลบหมวดหมู่สำเร็จ", "success");

    await loadCategories();
    renderCategories();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

/* ========================================
   งานของ Technician
======================================== */

async function loadAssignedTickets() {
  await loadTickets();

  const container = $("#assigned-list");
  if (!container) return;

  if (!state.tickets.length) {
    container.innerHTML =
      '<div class="empty-state">ยังไม่มีงานที่ได้รับมอบหมาย</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>เลขที่</th>
          <th>หัวข้อ</th>
          <th>สถานะ</th>
          <th>อัปเดตสถานะ</th>
          <th>แก้ไข</th>
          <th>รายละเอียด</th>
        </tr>
      </thead>

      <tbody>
        ${state.tickets.map((ticket) => `
          <tr>
            <td>#${escapeHTML(ticket.id)}</td>
            <td>${escapeHTML(ticket.title)}</td>

            <td>
              <span class="status-pill ${statusClass(ticket.status)}">
                ${escapeHTML(statusName(ticket.status))}
              </span>
            </td>

            <td>
              <select data-ticket-status="${escapeHTML(ticket.id)}">
                <option value="assigned" ${ticket.status === "assigned" ? "selected" : ""}>
                  มอบหมายแล้ว
                </option>

                <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>
                  กำลังดำเนินการ
                </option>

                <option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>
                  แก้ไขแล้ว
                </option>
              </select>

              <button
                type="button"
                class="action-button"
                data-save-ticket="${escapeHTML(ticket.id)}"
              >
                บันทึก
              </button>
            </td>

            <td>
              <button
                type="button"
                class="action-button"
                data-edit-ticket="${escapeHTML(ticket.id)}"
              >
                แก้ไข
              </button>
            </td>

            <td>
              <button
                type="button"
                class="action-button"
                data-view-history="${escapeHTML(ticket.id)}"
              >
                ดูประวัติ
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function saveTicketStatus(id) {
  const select = $(
    `[data-ticket-status="${CSS.escape(String(id))}"]`
  );

  if (!select) return;

  const note = await uiPrompt("หมายเหตุการอัปเดตสถานะ (เว้นว่างได้):", "");
  if (note === null) return;

  try {
    await api(`/technician/tickets/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: select.value,
        note
      })
    });

    showMessage(
      "#global-message",
      "อัปเดตสถานะ Ticket สำเร็จ",
      "success"
    );

    await loadAssignedTickets();
  } catch (error) {
    showMessage("#global-message", error.message);
  }
}

/* ========================================
   Event listeners
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  $("#login-form")?.addEventListener("submit", login);
  $("#register-form")?.addEventListener("submit", register);
  $("#show-register")?.addEventListener("click", showRegister);
  $("#show-login")?.addEventListener("click", backToLogin);
  $("#logout-button")?.addEventListener("click", logout);
  $("#ticket-form")?.addEventListener("submit", createTicket);
  $("#category-form")?.addEventListener("submit", addCategory);

  $("#refresh-button")?.addEventListener("click", () => {
    openPage(state.page);
  });

  $("#menu-toggle")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
  });

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      openPage(button.dataset.page);
    });
  });

  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      openPage(button.dataset.go);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const editTicketButton = target.closest("[data-edit-ticket]");
    const editCategoryButton = target.closest("[data-edit-category]");
    const deleteCategoryButton = target.closest("[data-delete-category]");
    const saveRoleButton = target.closest("[data-save-role]");
    const saveStatusButton = target.closest("[data-save-ticket]");
    const assignButton = target.closest("[data-assign-ticket]");
    const historyButton = target.closest("[data-view-history]");
    const reviewButton = target.closest("[data-review-ticket]");

    if (editTicketButton) {
      editTicket(editTicketButton.dataset.editTicket);
    }

    if (editCategoryButton) {
      editCategory(editCategoryButton.dataset.editCategory);
    }

    if (deleteCategoryButton) {
      deleteCategory(deleteCategoryButton.dataset.deleteCategory);
    }

    if (saveRoleButton) {
      saveUserRole(saveRoleButton.dataset.saveRole);
    }

    if (saveStatusButton) {
      saveTicketStatus(saveStatusButton.dataset.saveTicket);
    }

    if (assignButton) {
      assignTicket(assignButton.dataset.assignTicket);
    }

    if (historyButton) {
      viewTicketHistory(historyButton.dataset.viewHistory);
    }
    if (reviewButton) {
      openReviewModal(reviewButton.dataset.reviewTicket);
}
  });

  document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHistoryModal();
    closeEditTicketModal();
    closeReviewModal();
  }
});

  loadCurrentUser()
  .then(async () => {
    await loadTechnicianRatings();
    await openPage("dashboard");
  })
  .catch(() => showLogin());
});

/* ========================================
   อายุงานและ SLA
======================================== */
const SLA_HOURS = { urgent: 4, high: 8, medium: 24, low: 72 };

function timeAgo(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} ชม.` : `${Math.floor(h / 24)} วัน`;
}

function slaCell(t) {
  const created = new Date(t.created_at || t.createdAt);
  if (Number.isNaN(created.getTime())) return "-";
  const date = created.toLocaleString(window.LANG === "en" ? "en-GB" : "th-TH", { dateStyle: "medium", timeStyle: "short" });
  if (["resolved", "completed", "cancelled"].includes(t.status)) {
    return `<div class="age-date">${date}</div>`;
  }
  const limit = (SLA_HOURS[t.priority] || 24) * 3600000;
  const age = Date.now() - created.getTime();
  const [cls, txt] = age > limit ? ["sla-over", "เกิน SLA"] : age > limit * 0.75 ? ["sla-warn", "ใกล้ครบกำหนด"] : ["sla-ok", "ตามกำหนด"];
  return `<div class="age-date">${date}</div><span class="sla ${cls}">ค้าง ${timeAgo(age)} • ${txt}</span>`;
}
