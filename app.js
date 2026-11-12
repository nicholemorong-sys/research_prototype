(() => {
  "use strict";

  const KEYS = {
    users: "iskolar_marsu_users",
    scholarships: "iskolar_marsu_scholarships",
    applications: "iskolar_marsu_applications",
    announcements: "iskolar_marsu_announcements",
    payouts: "iskolar_marsu_payouts",
    session: "iskolar_marsu_session"
  };
  const ADMIN_EMAIL = "staff@marsu.edu.ph";
  const ADMIN_PASSWORD = "MarSUstaff26!";
  const today = new Date();
  const dateLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  const makeId = () => `marsu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let toastTimer;
  let storageReadWarning = false;

  const defaults = {
    scholarships: [
      { id: "tdp", name: "Tulong Dunong Program (TDP)", type: "National government", amount: "Up to ₱7,500 / semester", deadline: "2027-01-30", description: "Financial assistance for qualified undergraduate students to help cover education-related expenses.", requirements: "Certificate of registration, latest grades, proof of income, valid student ID." },
      { id: "tes", name: "Tertiary Education Subsidy (TES)", type: "UniFAST", amount: "Based on current guidelines", deadline: "2027-02-15", description: "A grant for eligible students enrolled in recognized higher education institutions, subject to program guidelines.", requirements: "Certificate of registration, latest grades, proof of household income, student information sheet." },
      { id: "provincial", name: "Provincial Government Scholarship", type: "Provincial government", amount: "Varies by scholarship category", deadline: "2027-02-28", description: "Scholarship opportunities supported by the Provincial Government of Marinduque for qualified residents.", requirements: "Proof of residency, certificate of registration, latest grades, income documentation." },
      { id: "lgu", name: "LGU Education Assistance", type: "Local government", amount: "Set by partner LGU", deadline: "2027-03-15", description: "Education assistance offered through participating municipal local government units.", requirements: "Barangay or municipal residency certification, certificate of registration, latest grades." },
      { id: "marsu", name: "MarSU Student Assistance", type: "MarSU-recognized", amount: "Subject to available funds", deadline: "2027-03-31", description: "Campus-based financial aid and donor-supported opportunities coordinated through the university.", requirements: "Certificate of registration, student profile, latest grades, supporting documents for need." }
    ],
    announcements: [
      { id: "ann-1", title: "Scholarship applications are open", date: "2026-11-05", category: "Applications", body: "Students may now review open scholarship opportunities and prepare the listed requirements. Check each program's eligibility and deadline before applying." },
      { id: "ann-2", title: "Keep your student profile up to date", date: "2026-10-28", category: "Reminder", body: "Please confirm your contact details and current program information so the scholarship office can reach you about your application." },
      { id: "ann-3", title: "Document submission guidelines", date: "2026-10-20", category: "Requirements", body: "Upload clear, readable PDF or image copies. Do not upload documents that are unrelated to the selected scholarship." }
    ],
    payouts: [
      { id: "pay-1", program: "Tulong Dunong Program (TDP)", date: "2027-02-20", venue: "MarSU Main Campus, Boac", details: "Release details will be confirmed by the Scholarship Office." },
      { id: "pay-2", program: "Provincial Government Scholarship", date: "2027-03-10", venue: "Provincial Capitol, Boac", details: "Bring a valid student ID and follow the official release instructions." },
      { id: "pay-3", program: "TES", date: "2027-03-25", venue: "To be announced", details: "Schedule is tentative and subject to confirmation by the program office." }
    ]
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(`Unable to read ${key} from browser storage.`, error);
      if (!storageReadWarning) {
        storageReadWarning = true;
        notify("Some saved demo data could not be read. Default content is shown; check browser storage before continuing.", "error");
      }
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Unable to save ${key} to browser storage.`, error);
      notify("Your browser could not save this change. Check available storage and try again.", "error");
      return false;
    }
  }
  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function notify(message, type = "success") {
    let node = document.querySelector(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.append(node);
    }
    node.textContent = message;
    node.dataset.type = type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.remove(), 4200);
  }
  async function hashPassword(text, saltHex) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Secure password hashing is unavailable. Open the app through a local or hosted HTTPS web server.");
    }
    const salt = saltHex
      ? new Uint8Array(saltHex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
      : window.crypto.getRandomValues(new Uint8Array(16));
    const key = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(text), "PBKDF2", false, ["deriveBits"]);
    const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
    return {
      passwordHash: Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join(""),
      passwordSalt: Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join("")
    };
  }
  function getUsers() { return read(KEYS.users, []); }
  function getApps() { return read(KEYS.applications, []); }
  function getScholarships() { return read(KEYS.scholarships, defaults.scholarships); }
  function getAnnouncements() { return read(KEYS.announcements, defaults.announcements); }
  function getPayouts() { return read(KEYS.payouts, defaults.payouts); }
  function currentUser() {
    const email = sessionStorage.getItem(KEYS.session);
    return email ? getUsers().find((user) => user.email === email && user.status === "active") || null : null;
  }
  const page = document.body.dataset.page || "login";
  const publicPages = ["login", "register"];
  const user = currentUser();
  if (!publicPages.includes(page) && !user) {
    window.location.replace("login.html");
    return;
  }
  if (page === "admin-dashboard" && user?.role !== "admin") {
    window.location.replace(user ? "student-dashboard.html" : "login.html");
    return;
  }
  if (page === "student-dashboard" && user?.role === "admin") {
    window.location.replace("admin-dashboard.html");
    return;
  }

  function logo() {
    return `<img src="assets/marsu_logo.png" alt="Marinduque State University official seal" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="brand-mark" hidden aria-hidden="true">M<span aria-hidden="true">SU</span></span>`;
  }
  function brand(link = "login.html") {
    return `<a class="brand" href="${link}" aria-label="ISKOLAR MARSU home">${logo()}<span class="brand-copy"><strong>ISKOLAR MARSU</strong><small>Scholarship Application &amp; Monitoring</small></span></a>`;
  }
  const studentLinks = [
    ["student-dashboard.html", "Dashboard", "⌂"],
    ["scholarships.html", "Scholarships", "◇"],
    ["tracking.html", "My applications", "◷"],
    ["payouts.html", "Payout schedules", "₱"],
    ["announcements.html", "Announcements", "▤"],
    ["profile.html", "My profile", "○"]
  ];
  const adminLinks = [
    ["admin-dashboard.html", "Overview & review", "⌂"],
    ["scholarships.html", "Scholarship programs", "◇"],
    ["announcements.html", "Announcements", "▤"],
    ["payouts.html", "Payout schedules", "₱"]
  ];
  function header() {
    if (publicPages.includes(page)) return "";
    const links = user.role === "admin" ? adminLinks : studentLinks;
    const dashboard = user.role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
    return `<a class="skip-link" href="#main-content">Skip to main content</a>
      <header class="topbar">
        ${brand(dashboard)}
        <div class="top-actions">
          <div class="notification-panel">
            <button type="button" class="notification-button" id="notification-toggle" aria-expanded="false" aria-controls="notification-popover" aria-label="Show notifications">♧ <span class="sr-only">Notifications</span></button>
            <div class="notification-popover" id="notification-popover" role="region" aria-label="Notifications">
              <strong>Notifications</strong><p>${user.role === "student" ? "Check your application status and recent scholarship announcements." : "Review newly submitted applications and registrations in your staff dashboard."}</p>
              <p><a href="${user.role === "student" ? "tracking.html" : "admin-dashboard.html"}">${user.role === "student" ? "View application updates" : "Open review queue"}</a></p>
            </div>
          </div>
          <div class="user-chip"><span class="avatar" aria-hidden="true">${esc((user.name || user.email).slice(0, 1).toUpperCase())}</span><span>${esc(user.name || user.email)}</span></div>
          <button type="button" class="button button-secondary button-small" id="logout">Sign out</button>
          <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="primary-navigation">Menu</button>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar" id="primary-navigation" aria-label="Main navigation">
          <div class="sidebar-label">${user.role === "student" ? "Student portal" : "Staff workspace"}</div>
          <nav aria-label="Primary">
            <ul class="nav-list">${links.map(([href, label, icon]) => `<li><a class="nav-link" href="${href}" ${href === pageFile() ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</a></li>`).join("")}</ul>
          </nav>
          <div class="sidebar-note">ISKOLAR MARSU is a scholarship support portal. Follow official university announcements for confirmed deadlines and payout schedules.</div>
        </aside>
        <main class="main" id="main-content" tabindex="-1"><div id="page-content"></div></main>
      </div>
      <footer class="footer">Marinduque State University · Scholarship Application and Monitoring System</footer>`;
  }
  function pageFile() { return `${page}.html`; }
  function statusBadge(status) {
    const css = status === "Approved" ? "badge-success" : status === "Rejected" ? "badge-danger" : "badge-warning";
    return `<span class="badge ${css}">${esc(status)}</span>`;
  }
  function heading(title, description, actions = "") {
    return `<div class="page-heading"><div><div class="eyebrow">ISKOLAR MARSU</div><h1>${title}</h1><p class="subheading">${description}</p></div>${actions ? `<div class="button-row">${actions}</div>` : ""}</div>`;
  }
  function stat(label, value, note, icon) {
    return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon" aria-hidden="true">${icon}</span></div><strong class="stat-value">${value}</strong><span class="stat-foot">${note}</span></article>`;
  }
  function renderLogin() {
    document.title = "Sign in | ISKOLAR MARSU";
    document.getElementById("app").innerHTML = `<div class="auth-page">
      <aside class="auth-aside">${brand("login.html")}<div class="auth-copy"><div class="eyebrow eyebrow-gold">Your next chapter starts here</div><h1>Scholarship support, made simpler.</h1><p>Discover financial aid opportunities, submit your requirements, and follow your application progress through one student-friendly portal.</p><div class="auth-points"><span>✓ Explore MarSU-recognized opportunities</span><span>✓ Follow application updates and schedules</span><span>✓ Access your scholarship information in one place</span></div></div><div class="auth-footer">Marinduque State University · Boac, Marinduque</div></aside>
      <main class="auth-content"><div><div class="auth-logo-mobile">${brand("login.html")}</div><section class="auth-card" aria-labelledby="login-title"><div class="eyebrow">Welcome back</div><h2 id="login-title">Sign in to your account</h2><p>Choose your account role, then enter your credentials.</p><div class="alert" id="form-alert" role="alert"></div>
        <form id="login-form"><div class="field"><label for="login-role">Account role</label><select id="login-role" name="role" required><option value="student">Student</option><option value="admin">Admin / Staff</option></select></div>
          <div class="field"><label for="login-email">University or registered email</label><input id="login-email" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8"></div>
          <button class="button button-full" type="submit">Sign in <span aria-hidden="true">→</span></button>
        </form><p class="auth-switch">New to ISKOLAR MARSU? <a href="register.html">Create an account</a></p>
        <div class="notice demo-access"><strong>Demo staff access</strong><br>Email: ${ADMIN_EMAIL}<br>Password: ${ADMIN_PASSWORD}<br>Use only with local demo data.</div>
      </section></div></main></div>`;
    document.getElementById("login-form").addEventListener("submit", login);
  }
  function renderRegister() {
    document.title = "Create account | ISKOLAR MARSU";
    document.getElementById("app").innerHTML = `<div class="auth-page">
      <aside class="auth-aside">${brand("login.html")}<div class="auth-copy"><div class="eyebrow eyebrow-gold">Start with your profile</div><h1>One portal for your scholarship journey.</h1><p>Create your portal account to review opportunities and keep your application details organized.</p><div class="auth-points"><span>✓ Create and maintain your student profile</span><span>✓ Submit requirements for open programs</span><span>✓ Track status updates and announcements</span></div></div><div class="auth-footer">Marinduque State University · Boac, Marinduque</div></aside>
      <main class="auth-content"><div><div class="auth-logo-mobile">${brand("login.html")}</div><section class="auth-card" aria-labelledby="register-title"><div class="eyebrow">Get started</div><h2 id="register-title">Create your account</h2><p>Select the role that matches your university access.</p><div class="alert" id="form-alert" role="alert"></div>
        <form id="register-form"><div class="field"><label for="register-role">Account role</label><select id="register-role" name="role" required><option value="student">Student</option><option value="admin">Admin / Staff</option></select><span class="field-hint">Staff registrations require activation by an existing administrator.</span></div>
          <div class="field"><label for="register-name">Full name</label><input id="register-name" name="name" autocomplete="name" required maxlength="100"></div>
          <div class="field"><label for="register-email">Email address</label><input id="register-email" name="email" type="email" autocomplete="email" required maxlength="150"></div>
          <div class="field"><label for="register-password">Password</label><input id="register-password" name="password" type="password" autocomplete="new-password" required minlength="8"><span class="field-hint">Use at least 8 characters. Demo accounts are stored in this browser only.</span></div>
          <button class="button button-full" type="submit">Create account</button>
        </form><p class="auth-switch">Already registered? <a href="login.html">Sign in</a></p></section></div></main></div>`;
    document.getElementById("register-form").addEventListener("submit", register);
  }
  function showAlert(message, success = false) {
    const alert = document.getElementById("form-alert");
    alert.className = `alert ${success ? "alert-success" : "alert-error"}`;
    alert.textContent = message;
  }
  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const email = String(form.get("email")).trim().toLowerCase();
      const account = getUsers().find((item) => item.email === email && item.role === form.get("role"));
      if (!account) {
        showAlert("The email, password, or selected role is incorrect.");
        return;
      }
      const credentials = await hashPassword(String(form.get("password")), account.passwordSalt);
      if (account.passwordHash !== credentials.passwordHash) {
        showAlert("The email, password, or selected role is incorrect.");
        return;
      }
      if (account.status !== "active") {
        showAlert(account.status === "pending" ? "This account is awaiting Admin/Staff activation. Please contact the Scholarship Office." : "This account is inactive. Please contact the Scholarship Office.");
        return;
      }
      sessionStorage.setItem(KEYS.session, account.email);
      window.location.href = account.role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
    } catch (error) {
      console.error("Sign-in could not be completed.", error);
      showAlert(error.message || "Sign-in could not be completed.");
    }
  }
  async function register(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitButton = formElement.querySelector('[type="submit"]');
    const form = new FormData(formElement);
    const email = String(form.get("email")).trim().toLowerCase();
    const name = String(form.get("name")).trim();
    const role = String(form.get("role"));
    if (getUsers().some((account) => account.email === email)) {
      showAlert("An account already uses this email address. Try signing in instead.");
      return;
    }
    submitButton.disabled = true;
    try {
      const credentials = await hashPassword(String(form.get("password")));
      const account = { id: makeId(), name, email, role, ...credentials, status: role === "student" ? "active" : "pending", profile: { program: "", year: "", phone: "", address: "" } };
      if (!save(KEYS.users, [...getUsers(), account])) return;
      if (role === "admin") {
        showAlert("Staff registration submitted. An active administrator must approve your account before you can sign in.", true);
        formElement.reset();
        submitButton.disabled = false;
        return;
      }
      sessionStorage.setItem(KEYS.session, email);
      window.location.href = "student-dashboard.html";
    } catch (error) {
      console.error("Account registration could not be completed.", error);
      showAlert(error.message || "Account registration could not be completed.");
      submitButton.disabled = false;
    }
  }

  function renderStudentDashboard() {
    const apps = getApps().filter((item) => item.email === user.email);
    const open = getScholarships().filter((item) => new Date(`${item.deadline}T23:59:59`) >= today);
    const notices = getAnnouncements().slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    return `${`<section class="welcome-banner"><div class="eyebrow">Student portal</div><h1>Welcome, ${esc((user.name || "Scholar").split(" ")[0])}.</h1><p>Your scholarship journey starts with finding the right opportunity.</p><a class="button button-gold" href="scholarships.html">Explore scholarships <span aria-hidden="true">→</span></a></section>`}
      <div class="grid stats-grid">${stat("Open opportunities", open.length, "Programs accepting applications", "◇")}${stat("Applications submitted", apps.length, "Across all scholarship programs", "▤")}${stat("Under review", apps.filter((item) => item.status === "Pending").length, "Awaiting a staff decision", "◷")}${stat("Approved", apps.filter((item) => item.status === "Approved").length, "View your latest application status", "✓")}</div>
      <div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><h2>My recent applications</h2><a class="text-link" href="tracking.html">View all</a></div>
        ${apps.length ? `<div class="list">${apps.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 4).map((item) => `<div class="list-row"><div><p class="list-title">${esc(item.scholarshipName)}</p><p class="list-meta">Submitted ${dateLabel(item.submittedAt)}</p></div>${statusBadge(item.status)}</div>`).join("")}</div>` : `<div class="empty-state">You haven’t submitted an application yet.<br><a href="scholarships.html">Browse open scholarships</a></div>`}
      </section><section class="panel"><div class="panel-head"><h2>Latest announcements</h2><a class="text-link" href="announcements.html">All updates</a></div><div class="list">${notices.map((item) => `<div class="list-row"><div><p class="list-title">${esc(item.title)}</p><p class="list-meta">${dateLabel(item.date)} · ${esc(item.category)}</p></div></div>`).join("")}</div></section></div>
      <section class="panel section-spacer"><div class="panel-head"><h2>Featured opportunities</h2><a class="text-link" href="scholarships.html">Browse all</a></div><div class="grid scholarship-grid">${open.slice(0, 3).map(scholarshipCard).join("")}</div></section>`;
  }
  function renderAdminDashboard() {
    const apps = getApps();
    const users = getUsers().filter((account) => account.role === "student");
    const pendingUsers = getUsers().filter((account) => account.status === "pending");
    const pendingApps = apps.filter((item) => item.status === "Pending");
    return `${heading("Staff dashboard", "Review student submissions, manage programs, and keep scholarship information current.", `<a class="button" href="#review-queue">Review applications</a>`)}
      <div class="grid stats-grid">${stat("Total applicants", users.length, "Student accounts registered", "♙")}${stat("Applications", apps.length, "All submitted applications", "▤")}${stat("Pending review", pendingApps.length, "Applications awaiting a decision", "◷")}${stat("Open programs", getScholarships().length, "Scholarship opportunities listed", "◇")}</div>
      ${pendingUsers.length ? `<section class="panel section-spacer"><div class="panel-head"><h2>Account activation requests <span class="badge badge-warning">${pendingUsers.length} pending</span></h2></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Requested role</th><th>Action</th></tr></thead><tbody>${pendingUsers.map((account) => `<tr><td>${esc(account.name)}</td><td>${esc(account.email)}</td><td>Admin / Staff</td><td><button type="button" class="button button-small" data-activate-user="${esc(account.id)}">Activate staff</button></td></tr>`).join("")}</tbody></table></div></section>` : ""}
      <section class="panel section-spacer" id="review-queue"><div class="panel-head"><h2>Application review queue</h2><span class="badge badge-warning">${pendingApps.length} pending</span></div>
        ${apps.length ? `<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Scholarship</th><th>Submitted</th><th>Status</th><th>Review</th></tr></thead><tbody>${apps.slice().sort((a,b) => a.submittedAt.localeCompare(b.submittedAt)).map((item) => { const applicant = getUsers().find((account) => account.email === item.email); return `<tr><td><strong>${esc(applicant?.name || item.email)}</strong><br><span class="list-meta">${esc(item.email)}</span></td><td>${esc(item.scholarshipName)}</td><td>${dateLabel(item.submittedAt)}</td><td>${statusBadge(item.status)}</td><td><button type="button" class="button button-secondary button-small" data-review-app="${esc(item.id)}">Review</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty-state">No applications have been submitted yet.</div>`}
      </section><section class="panel section-spacer"><div class="panel-head"><h2>Student registrations</h2><span class="badge badge-info">${users.length} students</span></div>${users.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Email</th><th>Program</th><th>Year level</th><th>Account status</th><th>Access</th></tr></thead><tbody>${users.map((account) => { const latest = getApps().filter((application) => application.email === account.email).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]; return `<tr><td><strong>${esc(account.name)}</strong></td><td>${esc(account.email)}</td><td>${esc(account.profile?.program || latest?.program || "Not provided")}</td><td>${esc(account.profile?.year || "Not provided")}</td><td>${account.status === "active" ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>'}</td><td><button type="button" class="button button-small ${account.status === "active" ? "button-danger" : ""}" data-toggle-student="${esc(account.id)}">${account.status === "active" ? "Suspend access" : "Restore access"}</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty-state">No student accounts have registered yet.</div>`}</section>
      <div class="grid dashboard-grid section-spacer"><section class="panel"><div class="panel-head"><h2>Quick actions</h2></div><div class="button-row"><a class="button button-secondary" href="scholarships.html#manage-programs">Manage programs</a><a class="button button-secondary" href="announcements.html#publish">Publish announcement</a><a class="button button-secondary" href="payouts.html#manage-payouts">Manage payouts</a></div></section><section class="panel"><div class="panel-head"><h2>Applicant records</h2><button class="button button-secondary button-small" id="export-applicants" type="button">Download CSV</button></div><p class="list-meta">Export registered students and submitted applications for office records.</p></section></div>`;
  }
  function scholarshipCard(item) {
    return `<article class="scholarship-card"><div class="card-kicker">${esc(item.type)}</div><h3 class="scholarship-title">${esc(item.name)}</h3><p>${esc(item.description)}</p><p><strong>Award:</strong> ${esc(item.amount)}<br><strong>Deadline:</strong> ${dateLabel(item.deadline)}</p><div class="card-bottom"><span class="badge badge-info">Open</span>${user.role === "student" ? `<a class="button button-small" href="application.html?scholarship=${encodeURIComponent(item.id)}">View &amp; apply</a>` : `<button type="button" class="button button-secondary button-small" data-edit-program="${esc(item.id)}">Edit</button>`}</div></article>`;
  }
  function renderScholarships() {
    const items = getScholarships();
    const isAdmin = user.role === "admin";
    return `${heading("Scholarship opportunities", isAdmin ? "Manage the programs visible to MarSU students." : "Browse programs, review requirements, and find an opportunity that fits you.", isAdmin ? `<button type="button" class="button" id="show-program-form">+ Add program</button>` : "")}
      ${isAdmin ? `<section class="panel" id="manage-programs" hidden><div class="panel-head"><h2 id="program-form-title">Add scholarship program</h2></div><form id="program-form"><div class="grid form-grid"><div class="field"><label for="program-name">Program name</label><input id="program-name" name="name" required maxlength="100"></div><div class="field"><label for="program-type">Provider / category</label><input id="program-type" name="type" required maxlength="80"></div><div class="field"><label for="program-amount">Award information</label><input id="program-amount" name="amount" required maxlength="100"></div><div class="field"><label for="program-deadline">Application deadline</label><input id="program-deadline" name="deadline" type="date" required></div></div><div class="field"><label for="program-description">Description</label><textarea id="program-description" name="description" required maxlength="500"></textarea></div><div class="field"><label for="program-requirements">Requirements</label><textarea id="program-requirements" name="requirements" required maxlength="500"></textarea></div><div class="button-row"><button type="submit" class="button" id="save-program">Publish program</button><button type="button" class="button button-secondary" id="cancel-program">Cancel</button></div></form></section>` : ""}
      <div class="toolbar section-spacer"><div class="field search-field"><label for="scholarship-search">Search programs</label><input id="scholarship-search" type="search" placeholder="Search by name, provider, or keyword"></div><div class="field filter-field"><label for="scholarship-filter">Provider</label><select id="scholarship-filter"><option value="">All providers</option>${[...new Set(items.map((item) => item.type))].map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}</select></div></div>
      <div class="grid scholarship-grid" id="scholarship-results">${items.map(scholarshipCard).join("") || `<div class="empty-state">No programs are listed yet.</div>`}</div>`;
  }
  function renderApplication() {
    if (user.role !== "student") return `${heading("Applications", "Student applications are submitted from the student portal.")}<div class="notice">Admin/Staff users review applications from the staff dashboard.</div>`;
    const scholarshipId = new URLSearchParams(location.search).get("scholarship");
    const scholarship = getScholarships().find((item) => item.id === scholarshipId);
    if (!scholarship) return `${heading("Scholarship application", "Choose a scholarship program to review its requirements.")}<div class="notice">This opportunity could not be found. <a href="scholarships.html">Browse available scholarships</a>.</div>`;
    const existing = getApps().some((item) => item.email === user.email && item.scholarshipId === scholarship.id);
    return `${heading("Apply for a scholarship", "Complete your details and attach the requested supporting documents.")}<div class="grid dashboard-grid"><section class="panel"><div class="eyebrow">${esc(scholarship.type)}</div><h2>${esc(scholarship.name)}</h2><p>${esc(scholarship.description)}</p><p><strong>Application deadline:</strong> ${dateLabel(scholarship.deadline)}<br><strong>Award information:</strong> ${esc(scholarship.amount)}</p><h3>Requirements</h3><p>${esc(scholarship.requirements)}</p></section><section class="panel"><h2>Applicant details</h2><div class="alert" id="form-alert" role="alert"></div>
        ${existing ? `<div class="notice">You have already submitted an application for this program. <a href="tracking.html">View its status</a>.</div>` : `<form id="application-form" data-scholarship="${esc(scholarship.id)}"><div class="field"><label for="application-phone">Contact number</label><input id="application-phone" name="phone" type="tel" autocomplete="tel" required maxlength="25" value="${esc(user.profile?.phone || "")}"></div><div class="field"><label for="application-program">Degree program and year level</label><input id="application-program" name="program" required maxlength="100" value="${esc(user.profile?.program || "")}"></div><div class="field"><label for="application-files">Required documents</label><input id="application-files" name="documents" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple required aria-describedby="upload-hint"><span class="field-hint" id="upload-hint">PDF, JPG, or PNG · Up to 5 MB per file. Submit only scholarship-related documents.</span><div class="file-list" id="selected-files" aria-live="polite"></div></div><label class="field checkbox-field"><input type="checkbox" name="confirm" required class="checkbox-control"><span class="field-hint">I confirm that my information and uploaded documents are accurate to the best of my knowledge.</span></label><button class="button" type="submit">Submit application</button></form>`}
      </section></div>`;
  }
  function renderProfile() {
    if (user.role !== "student") return `${heading("Student profiles", "Student account details are available for application review in the staff dashboard.")}<div class="notice">Staff can view applicant information associated with each submitted application.</div>`;
    const profile = user.profile || {};
    return `${heading("My profile", "Keep your contact and student information current for scholarship communications.")}<section class="panel"><div class="profile-head"><div class="profile-photo" id="profile-preview" aria-label="Profile photo preview">${esc(user.name.slice(0,1).toUpperCase())}</div><div><h2 class="profile-name">${esc(user.name)}</h2><p class="list-meta">${esc(user.email)} · Student</p></div></div><div class="alert" id="form-alert" role="alert"></div>
      <form id="profile-form"><div class="field"><label for="profile-image">Profile photo</label><input id="profile-image" name="image" type="file" accept="image/png,image/jpeg" aria-describedby="profile-image-hint"><span class="field-hint" id="profile-image-hint">Optional JPG or PNG image, maximum 3 MB.</span></div><div class="grid form-grid"><div class="field"><label for="profile-program">Degree program</label><input id="profile-program" name="program" maxlength="100" value="${esc(profile.program || "")}"></div><div class="field"><label for="profile-year">Year level</label><select id="profile-year" name="year"><option value="">Select year level</option>${["1st Year","2nd Year","3rd Year","4th Year","5th Year"].map((item) => `<option ${profile.year === item ? "selected" : ""}>${item}</option>`).join("")}</select></div><div class="field"><label for="profile-phone">Contact number</label><input id="profile-phone" name="phone" type="tel" autocomplete="tel" maxlength="25" value="${esc(profile.phone || "")}"></div><div class="field"><label for="profile-address">Address / municipality</label><input id="profile-address" name="address" autocomplete="street-address" maxlength="150" value="${esc(profile.address || "")}"></div></div><button class="button" type="submit">Save profile</button></form></section>`;
  }
  function renderAnnouncements() {
    const items = getAnnouncements().slice().sort((a, b) => b.date.localeCompare(a.date));
    const isAdmin = user.role === "admin";
    return `${heading("Announcements", isAdmin ? "Publish updates for students using the scholarship portal." : "Scholarship notices, application reminders, and important updates.", isAdmin ? `<a class="button" href="#publish">Publish announcement</a>` : "")}
      ${isAdmin ? `<section class="panel section-spacer" id="publish"><h2>Publish an announcement</h2><div class="alert" id="form-alert" role="alert"></div><form id="announcement-form"><div class="grid form-grid"><div class="field"><label for="announcement-title">Announcement title</label><input id="announcement-title" name="title" required maxlength="120"></div><div class="field"><label for="announcement-category">Category</label><select id="announcement-category" name="category"><option>Applications</option><option>Requirements</option><option>Reminder</option><option>Payouts</option><option>General</option></select></div></div><div class="field"><label for="announcement-body">Message</label><textarea id="announcement-body" name="body" required maxlength="1000"></textarea></div><button class="button" type="submit">Publish announcement</button></form></section>` : ""}
      <section class="grid section-spacer" id="announcement-list">${items.map((item) => `<article class="announcement-card"><div class="panel-head"><div><span class="badge badge-info">${esc(item.category)}</span><h2 class="announcement-title">${esc(item.title)}</h2></div><time class="list-meta" datetime="${esc(item.date)}">${dateLabel(item.date)}</time></div><p>${esc(item.body)}</p>${isAdmin ? `<button class="button button-danger button-small" type="button" data-delete-announcement="${esc(item.id)}">Delete announcement</button>` : ""}</article>`).join("") || `<div class="empty-state">There are no announcements yet.</div>`}</section>`;
  }
  function renderTracking() {
    const apps = getApps().filter((item) => item.email === user.email).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt));
    return `${heading("Application status", "Follow your submitted applications and view decisions recorded by Admin/Staff.")}${apps.length ? `<div class="grid">${apps.map((item) => `<article class="panel"><div class="panel-head"><div><div class="eyebrow">Submitted ${dateLabel(item.submittedAt)}</div><h2>${esc(item.scholarshipName)}</h2></div>${statusBadge(item.status)}</div><div class="timeline" aria-label="Application progress"><div class="timeline-item is-done"><span class="timeline-dot" aria-hidden="true"></span><div><h3>Application submitted</h3><p>Your application was received on ${dateLabel(item.submittedAt)}.</p></div></div><div class="timeline-item ${item.status !== "Pending" ? "is-done" : ""}"><span class="timeline-dot" aria-hidden="true"></span><div><h3>${item.status === "Pending" ? "Under staff review" : `Application ${esc(item.status.toLowerCase())}`}</h3><p>${item.status === "Pending" ? "The Scholarship Office will update your status after reviewing your documents." : esc(item.reviewNote || "Your application decision has been recorded by Admin/Staff.")}</p></div></div></div><p class="list-meta">Uploaded documents: ${(item.documents || []).map((doc) => esc(doc.name)).join(", ") || "None listed"}</p></article>`).join("")}</div>` : `<section class="panel empty-state">No submitted applications to track yet.<br><a href="scholarships.html">Browse scholarships</a></section>`}`;
  }
  function renderPayouts() {
    const items = getPayouts().slice().sort((a, b) => a.date.localeCompare(b.date));
    const isAdmin = user.role === "admin";
    return `${heading("Payout schedules", isAdmin ? "Publish or update scholarship release information for students." : "Review available payout dates and release instructions. Schedules may change; follow official notices.", isAdmin ? `<a class="button" href="#manage-payouts">Manage schedule</a>` : "")}
      ${isAdmin ? `<section class="panel section-spacer" id="manage-payouts"><h2 id="payout-form-title">Add payout schedule</h2><div class="alert" id="form-alert" role="alert"></div><form id="payout-form"><div class="grid form-grid"><div class="field"><label for="payout-program">Scholarship program</label><input id="payout-program" name="program" required maxlength="100"></div><div class="field"><label for="payout-date">Release date</label><input id="payout-date" name="date" type="date" required></div><div class="field"><label for="payout-venue">Venue / release method</label><input id="payout-venue" name="venue" required maxlength="150"></div><div class="field"><label for="payout-details">Instructions</label><input id="payout-details" name="details" maxlength="250"></div></div><div class="button-row"><button class="button" id="save-payout" type="submit">Publish schedule</button><button class="button button-secondary" id="cancel-payout-edit" type="button" hidden>Cancel edit</button></div></form></section>` : ""}
      <section class="panel section-spacer"><div class="panel-head"><h2>Upcoming releases</h2><span class="badge badge-info">${items.length} listed</span></div>${items.length ? `<div class="table-wrap"><table><thead><tr><th>Program</th><th>Release date</th><th>Venue / method</th><th>Details</th>${isAdmin ? "<th>Action</th>" : ""}</tr></thead><tbody>${items.map((item) => `<tr><td><strong>${esc(item.program)}</strong></td><td>${dateLabel(item.date)}</td><td>${esc(item.venue)}</td><td>${esc(item.details)}</td>${isAdmin ? `<td><div class="button-row"><button type="button" class="button button-secondary button-small" data-edit-payout="${esc(item.id)}">Edit</button><button type="button" class="button button-danger button-small" data-delete-payout="${esc(item.id)}">Remove</button></div></td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">No payout schedules have been published.</div>`}</section>
      <p class="field-hint section-spacer">Dates shown are subject to official confirmation by the relevant scholarship provider.</p>`;
  }
  const renderers = {
    "student-dashboard": renderStudentDashboard,
    "admin-dashboard": renderAdminDashboard,
    scholarships: renderScholarships,
    application: renderApplication,
    profile: renderProfile,
    announcements: renderAnnouncements,
    tracking: renderTracking,
    payouts: renderPayouts
  };

  function setupBase() {
    const app = document.getElementById("app");
    app.innerHTML = `<div class="shell">${header()}${publicPages.includes(page) ? "" : ""}</div>`;
    if (publicPages.includes(page)) return;
    const content = document.getElementById("page-content");
    content.innerHTML = renderers[page] ? renderers[page]() : renderStudentDashboard();
    document.getElementById("menu-toggle").addEventListener("click", (event) => {
      const nav = document.getElementById("primary-navigation");
      const open = nav.classList.toggle("is-open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
    });
    document.getElementById("notification-toggle").addEventListener("click", (event) => {
      const popup = document.getElementById("notification-popover");
      const open = popup.classList.toggle("is-open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
    });
    document.getElementById("logout").addEventListener("click", () => {
      sessionStorage.removeItem(KEYS.session);
      window.location.href = "login.html";
    });
    bindPageActions();
  }
  function bindPageActions() {
    if (page === "student-dashboard" || page === "admin-dashboard") bindDashboard();
    if (page === "scholarships") bindScholarships();
    if (page === "application") bindApplication();
    if (page === "profile") bindProfile();
    if (page === "announcements") bindAnnouncements();
    if (page === "payouts") bindPayouts();
  }
  function bindDashboard() {
    document.querySelectorAll("[data-toggle-student]").forEach((button) => button.addEventListener("click", () => {
      if (user.role !== "admin" || !window.confirm(`${button.textContent.trim()} for this student?`)) return;
      const users = getUsers();
      const target = users.find((item) => item.id === button.dataset.toggleStudent && item.role === "student");
      if (!target) return;
      target.status = target.status === "active" ? "disabled" : "active";
      if (save(KEYS.users, users)) {
        notify(`${target.name}'s account is ${target.status === "active" ? "active" : "inactive"}.`);
        setupBase();
      }
    }));
    document.querySelectorAll("[data-activate-user]").forEach((button) => button.addEventListener("click", () => {
      if (user.role !== "admin") return;
      const users = getUsers();
      const target = users.find((item) => item.id === button.dataset.activateUser && item.role === "admin");
      if (!target) return;
      target.status = "active";
      if (save(KEYS.users, users)) {
        notify(`${target.name} can now sign in as Admin/Staff.`);
        setupBase();
      }
    }));
    document.querySelectorAll("[data-review-app]").forEach((button) => button.addEventListener("click", () => reviewApplication(button.dataset.reviewApp)));
    const exportButton = document.getElementById("export-applicants");
    if (exportButton) exportButton.addEventListener("click", exportApplicants);
  }
  function reviewApplication(id) {
    if (user.role !== "admin") return;
    const item = getApps().find((app) => app.id === id);
    if (!item) return;
    const applicant = getUsers().find((account) => account.email === item.email);
    const info = applicant?.profile || {};
    const docs = (item.documents || []).map((doc) => `<li><a href="#" data-download-doc="${esc(doc.key)}" data-doc-name="${esc(doc.name)}">${esc(doc.name)}</a></li>`).join("");
    const modal = document.createElement("dialog");
    modal.className = "review-dialog";
    modal.setAttribute("aria-labelledby", "review-title");
    modal.innerHTML = `<form method="dialog" class="panel review-form"><div class="panel-head"><h2 id="review-title">Review application</h2><button class="button button-secondary button-small" aria-label="Close review">Close</button></div><p><strong>Applicant:</strong> ${esc(applicant?.name || item.email)}<br><strong>Email:</strong> ${esc(item.email)}<br><strong>Program / year:</strong> ${esc(item.program || info.program || "Not provided")} · ${esc(info.year || "Not provided")}<br><strong>Contact:</strong> ${esc(item.phone || info.phone || "Not provided")}<br><strong>Address:</strong> ${esc(info.address || "Not provided")}</p><p><strong>Application:</strong> ${esc(item.scholarshipName)} · ${dateLabel(item.submittedAt)}</p><h3>Uploaded documents</h3><ul>${docs || "<li>No attached documents</li>"}</ul><label class="field checkbox-field"><input type="checkbox" id="verify-applicant" ${item.applicantVerified ? "checked" : ""} class="checkbox-control"><span class="field-hint">Applicant information has been checked against the submitted requirements.</span></label><div class="field"><label for="review-status">Application status</label><select id="review-status"><option ${item.status === "Pending" ? "selected" : ""}>Pending</option><option ${item.status === "Approved" ? "selected" : ""}>Approved</option><option ${item.status === "Rejected" ? "selected" : ""}>Rejected</option></select></div><div class="field"><label for="review-note">Decision note (visible to student)</label><textarea id="review-note" maxlength="500">${esc(item.reviewNote || "")}</textarea></div><div class="button-row"><button type="button" class="button" id="save-review">Save review</button></div></form>`;
    document.body.append(modal);
    modal.showModal();
    modal.addEventListener("close", () => modal.remove(), { once: true });
    modal.querySelectorAll("[data-download-doc]").forEach((link) => link.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await downloadFile(link.dataset.downloadDoc, link.dataset.docName); }
      catch (error) { console.error("Could not open uploaded document.", error); notify(error.message, "error"); }
    }));
    modal.querySelector("#save-review").addEventListener("click", () => {
      if (user.role !== "admin") return;
      const apps = getApps();
      const target = apps.find((entry) => entry.id === id);
      if (!target) return;
      target.status = modal.querySelector("#review-status").value;
      target.reviewNote = modal.querySelector("#review-note").value.trim();
      target.applicantVerified = modal.querySelector("#verify-applicant").checked;
      if (save(KEYS.applications, apps)) {
        modal.close();
        notify("Application decision updated.");
        setupBase();
      }
    });
  }
  function exportApplicants() {
    if (user.role !== "admin") return;
    const rows = [["Applicant", "Email", "Scholarship", "Submitted", "Status", "Program", "Year"]];
    getApps().forEach((item) => {
      const applicant = getUsers().find((account) => account.email === item.email);
      rows.push([applicant?.name || "", item.email, item.scholarshipName, item.submittedAt, item.status, applicant?.profile?.program || "", applicant?.profile?.year || ""]);
    });
    if (rows.length === 1) getUsers().filter((account) => account.role === "student").forEach((account) => rows.push([account.name, account.email, "", "", "", account.profile?.program || "", account.profile?.year || ""]));
    const csv = rows.map((row) => row.map((cell) => {
      const value = String(cell).replace(/[\r\n]/g, " ");
      const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "iskolar-marsu-applicant-records.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Applicant records exported.");
  }
  function bindScholarships() {
    const formPanel = document.getElementById("manage-programs");
    const form = document.getElementById("program-form");
    const show = document.getElementById("show-program-form");
    const submit = document.getElementById("save-program");
    const title = document.getElementById("program-form-title");
    if (show) show.addEventListener("click", () => {
      form.reset();
      delete form.dataset.editId;
      title.textContent = "Add scholarship program";
      submit.textContent = "Publish program";
      formPanel.hidden = false;
      formPanel.scrollIntoView({ behavior: "smooth" });
      document.getElementById("program-name").focus();
    });
    const cancel = document.getElementById("cancel-program");
    if (cancel) cancel.addEventListener("click", () => {
      form.reset();
      delete form.dataset.editId;
      title.textContent = "Add scholarship program";
      submit.textContent = "Publish program";
      formPanel.hidden = true;
    });
    const bindEditButtons = () => document.querySelectorAll("[data-edit-program]").forEach((button) => button.addEventListener("click", () => {
      if (user.role !== "admin") return;
      const item = getScholarships().find((scholarship) => scholarship.id === button.dataset.editProgram);
      if (!item) return;
      Object.entries(item).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) field.value = value;
      });
      form.dataset.editId = item.id;
      title.textContent = "Edit scholarship program";
      submit.textContent = "Save program changes";
      formPanel.hidden = false;
      formPanel.scrollIntoView({ behavior: "smooth" });
      document.getElementById("program-name").focus();
    }));
    if (form) form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (user.role !== "admin") return;
      const values = Object.fromEntries(new FormData(form));
      const items = getScholarships();
      const target = items.find((item) => item.id === form.dataset.editId);
      const message = target ? "Scholarship program updated." : "Scholarship program published.";
      if (target) Object.assign(target, values);
      else items.unshift({ ...values, id: makeId() });
      if (save(KEYS.scholarships, items)) { notify(message); setupBase(); }
    });
    bindEditButtons();
    const search = document.getElementById("scholarship-search");
    const filter = document.getElementById("scholarship-filter");
    const update = () => {
      const term = search.value.trim().toLowerCase();
      const provider = filter.value;
      const matches = getScholarships().filter((item) => (!provider || item.type === provider) && `${item.name} ${item.type} ${item.description}`.toLowerCase().includes(term));
      document.getElementById("scholarship-results").innerHTML = matches.map(scholarshipCard).join("") || `<div class="empty-state">No programs match your search. Try another keyword or provider.</div>`;
      bindEditButtons();
    };
    search.addEventListener("input", update);
    filter.addEventListener("change", update);
  }
  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("This browser does not support local document storage. Try a current browser.")); return; }
      const request = indexedDB.open("iskolar-marsu-files", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("files");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open local document storage."));
    });
  }
  async function storeFile(key, file) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not save an uploaded file.")); };
    });
  }
  async function downloadFile(key, name) {
    const db = await openDatabase();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const request = tx.objectStore("files").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not load the uploaded document."));
      tx.oncomplete = () => db.close();
    });
    if (!blob) throw new Error("The document is unavailable in this browser.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function validFile(file, maxBytes, imageOnly = false) {
    const allowed = imageOnly ? ["image/jpeg", "image/png"] : ["application/pdf", "image/jpeg", "image/png"];
    return allowed.includes(file.type) && file.size <= maxBytes;
  }
  function bindApplication() {
    const form = document.getElementById("application-form");
    if (!form) return;
    const picker = document.getElementById("application-files");
    picker.addEventListener("change", () => {
      const files = Array.from(picker.files);
      document.getElementById("selected-files").innerHTML = files.map((file) => `<div class="file-chip"><span>${esc(file.name)} · ${(file.size / 1024 / 1024).toFixed(2)} MB</span></div>`).join("");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const files = Array.from(picker.files);
      if (!files.length || files.some((file) => !validFile(file, 5 * 1024 * 1024))) {
        showAlert("Choose at least one PDF, JPG, or PNG file. Each file must be no larger than 5 MB.");
        return;
      }
      const scholarship = getScholarships().find((item) => item.id === form.dataset.scholarship);
      if (!scholarship) { showAlert("This scholarship is no longer available."); return; }
      const applications = getApps();
      if (applications.some((item) => item.email === user.email && item.scholarshipId === scholarship.id)) {
        showAlert("You already have an application for this scholarship.");
        return;
      }
      try {
        const documents = [];
        for (const file of files) {
          const key = makeId();
          await storeFile(key, file);
          documents.push({ key, name: file.name, type: file.type, size: file.size });
        }
        applications.push({ id: makeId(), email: user.email, scholarshipId: scholarship.id, scholarshipName: scholarship.name, submittedAt: new Date().toISOString().slice(0,10), status: "Pending", documents, phone: new FormData(form).get("phone"), program: new FormData(form).get("program"), reviewNote: "" });
        if (save(KEYS.applications, applications)) window.location.href = "tracking.html";
      } catch (error) {
        console.error("Application documents could not be saved.", error);
        showAlert(error.message || "Documents could not be saved. Please try again.");
      }
    });
  }
  async function bindProfile() {
    if (user.profile?.photoKey) {
      try {
        const db = await openDatabase();
        const blob = await new Promise((resolve, reject) => {
          const tx = db.transaction("files", "readonly");
          const request = tx.objectStore("files").get(user.profile.photoKey);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => db.close();
        });
        if (blob) showProfilePhoto(URL.createObjectURL(blob));
      } catch (error) {
        console.error("Could not load the profile photo.", error);
        notify("The saved profile photo could not be loaded.", "error");
      }
    }
    const form = document.getElementById("profile-form");
    if (!form) return;
    const photoInput = document.getElementById("profile-image");
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (file && validFile(file, 3 * 1024 * 1024, true)) showProfilePhoto(URL.createObjectURL(file));
      else if (file) showAlert("Choose a JPG or PNG profile image no larger than 3 MB.");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const photo = photoInput.files[0];
      if (photo && !validFile(photo, 3 * 1024 * 1024, true)) { showAlert("Choose a JPG or PNG profile image no larger than 3 MB."); return; }
      const users = getUsers();
      const account = users.find((item) => item.email === user.email);
      if (!account || account.role !== "student") { showAlert("Only students can edit a student profile."); return; }
      const values = Object.fromEntries(new FormData(form));
      try {
        if (photo) {
          const photoKey = makeId();
          await storeFile(photoKey, photo);
          values.photoKey = photoKey;
        } else if (account.profile?.photoKey) values.photoKey = account.profile.photoKey;
        account.profile = { ...account.profile, program: String(values.program || "").trim(), year: String(values.year || ""), phone: String(values.phone || "").trim(), address: String(values.address || "").trim(), ...(values.photoKey ? { photoKey: values.photoKey } : {}) };
        if (save(KEYS.users, users)) { showAlert("Your profile has been saved in this browser.", true); }
      } catch (error) {
        console.error("Profile could not be saved.", error);
        showAlert(error.message || "Profile could not be saved.");
      }
    });
  }
  function showProfilePhoto(url) {
    const box = document.getElementById("profile-preview");
    if (box) box.innerHTML = `<img src="${url}" alt="Your profile photo">`;
  }
  function bindAnnouncements() {
    const form = document.getElementById("announcement-form");
    if (form) form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (user.role !== "admin") return;
      const values = Object.fromEntries(new FormData(form));
      const items = getAnnouncements();
      items.unshift({ ...values, id: makeId(), date: new Date().toISOString().slice(0, 10) });
      if (save(KEYS.announcements, items)) { notify("Announcement published."); setupBase(); }
    });
    document.querySelectorAll("[data-delete-announcement]").forEach((button) => button.addEventListener("click", () => {
      if (user.role !== "admin" || !window.confirm("Delete this announcement?")) return;
      if (save(KEYS.announcements, getAnnouncements().filter((item) => item.id !== button.dataset.deleteAnnouncement))) { notify("Announcement deleted."); setupBase(); }
    }));
  }
  function bindPayouts() {
    const form = document.getElementById("payout-form");
    const title = document.getElementById("payout-form-title");
    const submit = document.getElementById("save-payout");
    const cancelEdit = document.getElementById("cancel-payout-edit");
    if (form) {
      document.querySelectorAll("[data-edit-payout]").forEach((button) => button.addEventListener("click", () => {
        if (user.role !== "admin") return;
        const item = getPayouts().find((payout) => payout.id === button.dataset.editPayout);
        if (!item) return;
        Object.entries(item).forEach(([key, value]) => {
          const field = form.elements.namedItem(key);
          if (field) field.value = value;
        });
        form.dataset.editId = item.id;
        title.textContent = "Edit payout schedule";
        submit.textContent = "Save schedule changes";
        cancelEdit.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("payout-program").focus();
      }));
      cancelEdit.addEventListener("click", () => {
        form.reset();
        delete form.dataset.editId;
        title.textContent = "Add payout schedule";
        submit.textContent = "Publish schedule";
        cancelEdit.hidden = true;
      });
    }
    if (form) form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (user.role !== "admin") return;
      const values = Object.fromEntries(new FormData(form));
      const items = getPayouts();
      const target = items.find((item) => item.id === form.dataset.editId);
      const message = target ? "Payout schedule updated." : "Payout schedule published.";
      if (target) Object.assign(target, values);
      else items.push({ ...values, id: makeId() });
      if (save(KEYS.payouts, items)) { notify(message); setupBase(); }
    });
    document.querySelectorAll("[data-delete-payout]").forEach((button) => button.addEventListener("click", () => {
      if (user.role !== "admin" || !window.confirm("Remove this payout schedule?")) return;
      if (save(KEYS.payouts, getPayouts().filter((item) => item.id !== button.dataset.deletePayout))) { notify("Payout schedule removed."); setupBase(); }
    }));
  }
  async function initialize() {
    if (!localStorage.getItem(KEYS.scholarships)) save(KEYS.scholarships, defaults.scholarships);
    if (!localStorage.getItem(KEYS.announcements)) save(KEYS.announcements, defaults.announcements);
    if (!localStorage.getItem(KEYS.payouts)) save(KEYS.payouts, defaults.payouts);
    if (!getUsers().some((account) => account.email === ADMIN_EMAIL)) {
      try {
        const users = getUsers();
        const credentials = await hashPassword(ADMIN_PASSWORD);
        users.push({ id: "marsu-demo-admin", name: "Scholarship Office", email: ADMIN_EMAIL, role: "admin", ...credentials, status: "active", profile: {} });
        save(KEYS.users, users);
      } catch (error) {
        console.error("Demo staff account could not be initialized.", error);
      }
    }
    if (page === "login") renderLogin();
    else if (page === "register") renderRegister();
    else setupBase();
  }
  initialize();
})();
