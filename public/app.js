// ============================================================
//  app.js — Pink Horizon Academy SPA
//  Views: landing, apply, registered, login, lms, registrar
// ============================================================
const API = "/api";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => r.querySelectorAll(s);

const PALETTE = ["#e84a8a","#3a7bd5","#2ea86f","#f2c14e","#c22e6e","#2b5fa8","#1f8354","#f47fb1","#1aa3a3","#8a5a9e","#6ab04c","#4aa6c2","#d76d77","#a3c14a","#e67e22"];

// Static key dates shown in the LMS "Academic Calendar" widget.
const ACADEMIC_CALENDAR = [
  { month: "Aug", day: "15", title: "Start of Classes", sub: "1st Semester" },
  { month: "Sep", day: "29", title: "Orientation Week", sub: "Villamor Gymnasium" },
  { month: "Oct", day: "20", title: "Midterm Exams", sub: "All year levels" },
  { month: "Dec", day: "15", title: "Final Exams", sub: "1st Semester" },
];

// Does a schedule string (e.g. "MWF 9:00-10:00" or "TTh 1:00-2:30") include this weekday?
function scheduleHasDay(sched, dayCode) {
  if (!sched) return false;
  const days = (sched.split(" ")[0] || "");           // the "MWF" / "TTh" / "Sat" part
  // Tokenize so Th/Sat/Sun aren't confused with T/S.
  const tokens = days.match(/Sun|Sat|Th|M|T|W|F|S/g) || [];
  return tokens.includes(dayCode);
}
const charts = {};
let LOOKUPS = null;
let dashboardLoaded = false;

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}
async function postJSON(url, body) {
  return getJSON(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

// ---------------- ROUTING ----------------
function go(view) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  const el = $(`#view-${view}`);
  if (el) el.classList.add("active");
  $$(".topnav button").forEach((b) => b.classList.toggle("active", b.dataset.go === view));
  // The LMS is a full-screen portal: hide the public top bar while inside it.
  document.body.classList.toggle("in-portal", view === "lms");
  window.scrollTo(0, 0);
  if (view === "apply") ensureLookups().then(fillFormLookups);
  if (view === "registrar") loadDashboard();
  if (view === "lms") loadLMS();
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go]");
  if (t) { e.preventDefault(); go(t.dataset.go); }
});

// ---------------- SESSION / NAV STATE ----------------
async function refreshAuthUI() {
  try {
    const { user } = await getJSON(`${API}/me`);
    $("#topnavUser").hidden = false;
    $("#userChip").textContent = user.name;
    $("#topnav").querySelector('[data-go="login"]').hidden = true;
    document.body.classList.add("logged-in");
  } catch {
    $("#topnavUser").hidden = true;
    const l = $("#topnav").querySelector('[data-go="login"]');
    if (l) l.hidden = false;
    document.body.classList.remove("logged-in");
  }
}
async function doLogout() {
  await postJSON(`${API}/logout`, {});
  document.body.classList.remove("logged-in", "in-portal");
  await refreshAuthUI();
  go("landing");
}
$("#logoutBtn").addEventListener("click", doLogout);
$("#portalLogout").addEventListener("click", doLogout);

// LMS sidebar sub-navigation
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-lms]");
  if (!t || t.tagName !== "BUTTON") return;
  const key = t.dataset.lms;
  $$(".pnav").forEach((b) => b.classList.toggle("active", b.dataset.lms === key));
  $$(".lms-panel").forEach((p) => p.classList.toggle("active", p.dataset.lms === key));
});

// ---------------- LOOKUPS ----------------
async function ensureLookups() {
  if (!LOOKUPS) LOOKUPS = await getJSON(`${API}/lookups`);
  return LOOKUPS;
}
// Sort so any real "Other / Others" row sinks to the very bottom of the list.
function orderLookup(items) {
  const isOther = (n) => /^\s*others?\s*$/i.test(n || "");
  return [...items].sort((a, b) => {
    const ao = isOther(a.name), bo = isOther(b.name);
    if (ao && !bo) return 1;   // a goes after b
    if (!ao && bo) return -1;  // a goes before b
    return 0;                  // keep original DB order otherwise
  });
}
function fillFormLookups() {
  $$("#applyForm [data-lk]").forEach((sel) => {
    const key = sel.dataset.lk;
    const items = orderLookup(LOOKUPS[key] || []);
    // Required selects: a neutral "Select" prompt at the top.
    // Optional selects: an explicit "Optional / Not Applicable" prompt at the top.
    const placeholder = sel.hasAttribute("required")
      ? "-- Select --"
      : "-- Optional / Not Applicable --";
    sel.innerHTML =
      `<option value="">${placeholder}</option>` +
      items.map((i) => `<option value="${i.id}">${i.name}</option>`).join("");
  });
}

// ============================================================
//  APPLICATION FORM (stepper)
// ============================================================
let step = 0;
const STEPS = 5;
function showStep(n) {
  step = Math.max(0, Math.min(STEPS - 1, n));
  $$(".step-panel").forEach((p) => p.classList.toggle("active", +p.dataset.step === step));
  $$(".stepper .step").forEach((s) => {
    const i = +s.dataset.step;
    s.classList.toggle("active", i === step);
    s.classList.toggle("done", i < step);
  });
  $("#prevBtn").hidden = step === 0;
  $("#nextBtn").hidden = step === STEPS - 1;
  $("#submitBtn").hidden = step !== STEPS - 1;
}
// Validate one panel: required fields filled, email is @gmail.com, numbers valid.
function validatePanel(panel) {
  for (const inp of panel.querySelectorAll("[required]")) {
    if (!inp.value.trim()) { inp.focus(); return "Please fill out all required fields (marked with *)."; }
  }
  const email = panel.querySelector('input[name="Email"]');
  if (email && email.value.trim() && !/^[^\s@]+@gmail\.com$/i.test(email.value.trim())) {
    email.focus(); return "Email must be a valid address ending in @gmail.com.";
  }
  for (const numInp of panel.querySelectorAll('input[type="number"]')) {
    if (numInp.value.trim() && isNaN(Number(numInp.value))) {
      numInp.focus(); return "Number fields must contain digits only.";
    }
  }
  return null;
}

$("#nextBtn").addEventListener("click", () => {
  const panel = $(`.step-panel[data-step="${step}"]`);
  const msg = validatePanel(panel);
  const err = $("#applyError");
  if (msg) { err.textContent = msg; err.hidden = false; return; }
  err.hidden = true;
  showStep(step + 1);
});

// Auto-calculate Age from the chosen Birthday (Age field is read-only).
function calcAgeFromBirthday() {
  const bday = $('#applyForm input[name="Birthday"]');
  const ageEl = $('#applyForm input[name="Age"]');
  if (!bday || !ageEl) return;
  const v = bday.value;
  if (!v) { ageEl.value = ""; return; }
  const b = new Date(v);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;   // birthday not reached yet this year
  ageEl.value = age >= 0 && age < 150 ? age : "";
}
document.addEventListener("change", (e) => {
  if (e.target.matches && e.target.matches('#applyForm input[name="Birthday"]')) calcAgeFromBirthday();
});

// Block any non-numeric key in number/contact inputs (keeps them truly numbers-only).
document.addEventListener("keypress", (e) => {
  const t = e.target;
  if (t.matches && t.matches('input[type="number"], input[inputmode="numeric"]')) {
    const allowDecimal = t.getAttribute("inputmode") === "decimal";
    const ch = String.fromCharCode(e.which);
    if (!/[0-9]/.test(ch) && !(allowDecimal && ch === ".")) e.preventDefault();
  }
});
$("#prevBtn").addEventListener("click", () => showStep(step - 1));

$("#applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#applyError");
  err.hidden = true;
  const f = e.target;
  const g = (n) => f.elements[n] ? f.elements[n].value.trim() : "";
  const chk = (n) => f.elements[n] && f.elements[n].checked;

  // Validate every panel (jumps the user to the first one with a problem).
  for (const panel of $$(".step-panel")) {
    const msg = validatePanel(panel);
    if (msg) {
      showStep(+panel.dataset.step);
      err.textContent = msg; err.hidden = false; return;
    }
  }

  if (g("a_password") !== g("a_confirm")) {
    showStep(4);
    err.textContent = "Passwords do not match."; err.hidden = false; return;
  }

  const payload = {
    general: {
      FName: g("FName"), MName: g("MName"), LName: g("LName"), Nickname: g("Nickname"),
      Age: g("Age"), SexID: g("SexID"), CivilStatusID: g("CivilStatusID"), Birthday: g("Birthday"),
      Birthplace: g("Birthplace"), Citizenship: g("Citizenship"), ReligionID: g("ReligionID"),
      RegionID: g("RegionID"), LanguageSpoken: g("LanguageSpoken"), Indigenous: g("Indigenous"),
      ResidenceID: g("ResidenceID"), Contact: g("Contact"), Email: g("Email"),
      PresentAdd: g("PresentAdd"), PermanentAdd: g("PermanentAdd"),
      CampusID: g("CampusID"), ProgramID: g("ProgramID"), SemID: g("SemID"),
      AcadYearID: g("AcadYearID"), YearSec: g("YearSec"),
    },
    family: {
      MaritalID: g("f_MaritalID"), LivingID: g("f_LivingID"), FName: g("f_FName"),
      Foccupation: g("f_Foccupation"), Fcontact: g("f_Fcontact"), Mname: g("f_Mname"),
      Moccupation: g("f_Moccupation"), Mcontact: g("f_Mcontact"), NumofSibs: g("f_NumofSibs"),
      Birthorder: g("f_Birthorder"), HouseIncomeID: g("f_HouseIncomeID"), Finance: g("f_Finance"),
      Is4PsMember: chk("f_Is4PsMember"),
    },
    education: {
      ElemName: g("e_ElemName"), ElemYear: g("e_ElemYear"), JHName: g("e_JHName"), JHYear: g("e_JHYear"),
      SHName: g("e_SHName"), SHYear: g("e_SHYear"), SHTrack: g("e_SHTrack"), Awards: g("e_Awards"), Scholar: g("e_Scholar"),
    },
    medical: {
      Height: g("m_Height"), Weight: g("m_Weight"), Chronic: g("m_Chronic"),
      Disability: g("m_Disability"), PWD: chk("m_PWD"),
    },
    other: {
      Sinterest: g("o_Sinterest"), Skill: g("o_Skill"), Hobbies: g("o_Hobbies"),
      Ambition: g("o_Ambition"), Motto: g("o_Motto"),
    },
    account: { username: g("a_username"), password: g("a_password") },
  };

  $("#submitBtn").disabled = true;
  $("#submitBtn").textContent = "Submitting...";
  try {
    const r = await postJSON(`${API}/apply`, payload);
    // show registration-complete screen
    $("#rgName").textContent = `${payload.general.FName} ${payload.general.LName}`;
    $("#rgStudentNo").textContent = r.studentNo;
    $("#rgUsername").textContent = r.username;
    f.reset();
    showStep(0);
    dashboardLoaded = false; // force dashboard refresh next time
    go("registered");
  } catch (ex) {
    err.textContent = ex.message; err.hidden = false;
  } finally {
    $("#submitBtn").disabled = false;
    $("#submitBtn").textContent = "Submit Application";
  }
});

// ============================================================
//  LOGIN
// ============================================================
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#loginError"); err.hidden = true;
  const f = e.target;
  try {
    await postJSON(`${API}/login`, { username: f.username.value.trim(), password: f.password.value });
    f.reset();
    await refreshAuthUI();
    go("lms");
  } catch (ex) {
    err.textContent = ex.message; err.hidden = false;
  }
});

// ============================================================
//  LMS HOME
// ============================================================
async function loadLMS() {
  try {
    const d = await getJSON(`${API}/lms/home`);
    const s = d.student;
    const fullName = `${s.FName} ${s.LName}`;
    const initial = (s.FName[0] || "S").toUpperCase();

    // header + sidebar identity
    $("#lmsName").textContent = fullName;
    $("#lmsMeta").textContent = [s.StudentNo, s.ProgramName, s.CampusName].filter(Boolean).join(" · ");
    $("#lmsAvatar").textContent = initial;
    $("#lmsSideName").textContent = fullName;
    $("#lmsSideSno").textContent = s.StudentNo;

    // dashboard quick stats
    const totalUnits = d.courses.reduce((sum, c) => sum + Number(c.units || 0), 0);
    $("#lmsStats").innerHTML = [
      ["Enrolled Courses", d.courses.length],
      ["Total Units", totalUnits],
      ["Semester", s.SemNo || "—"],
      ["Academic Year", s.AcadYear || "—"],
    ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

    // announcements
    $("#lmsAnnouncements").innerHTML = d.announcements
      .map((a) => `<div class="ann"><div class="t">${a.title}</div><div class="d">${a.date}</div><div class="b">${a.body}</div></div>`)
      .join("");

    // schedule table
    $("#lmsCourses").innerHTML = d.courses
      .map((c) => `<tr><td><b>${c.code}</b></td><td>${c.title}</td><td>${c.units}</td><td>${c.sched}</td></tr>`)
      .join("");

    // course cards
    $("#lmsCourseCards").innerHTML = d.courses
      .map((c) => `<div class="course-card"><div class="cc-code">${c.code}</div><div class="cc-title">${c.title}</div><div class="cc-meta">${c.units} units · ${c.sched}</div></div>`)
      .join("");

    // Today's Classes widget: match the current weekday against each course schedule.
    const dayCodes = ["Sun", "M", "T", "W", "Th", "F", "Sat"];
    const todayCode = dayCodes[new Date().getDay()];
    const todays = d.courses.filter((c) => scheduleHasDay(c.sched, todayCode));
    $("#lmsToday").innerHTML = todays.length
      ? todays.map((c) => `<div class="today-item"><span class="dot"></span><div><div class="ti-code">${c.code} — ${c.title}</div><div class="ti-sched">${c.sched}</div></div></div>`).join("")
      : `<div class="today-empty">No classes scheduled today. Enjoy your day off.</div>`;

    // Academic Calendar widget (static key dates for the term)
    $("#lmsCalendar").innerHTML = ACADEMIC_CALENDAR
      .map((e) => `<div class="cal-item"><div class="cal-date"><span class="m">${e.month}</span><span class="d">${e.day}</span></div><div class="cal-text"><div class="ct-title">${e.title}</div><div class="ct-sub">${e.sub}</div></div></div>`)
      .join("");

    // profile
    $("#lmsProfile").innerHTML = [
      ["Full Name", fullName], ["Student No.", s.StudentNo], ["Program", s.ProgramName], ["Campus", s.CampusName],
      ["Semester", s.SemNo], ["Academic Year", s.AcadYear], ["Year/Section", s.YearSec],
      ["Email", s.Email], ["Contact", s.Contact],
    ].map(([k, v]) => `<div class="row"><span>${k}</span><b>${v || "—"}</b></div>`).join("");
  } catch (ex) {
    if (String(ex.message).includes("logged in")) { go("login"); return; }
    $("#lmsAnnouncements").innerHTML = `<div class="form-error">${ex.message}</div>`;
  }
}

// ============================================================
//  REGISTRAR DASHBOARD
// ============================================================
async function loadDashboard() {
  if (dashboardLoaded) return;
  try {
    await ensureLookups();
    fillSelect("#filterProgram", LOOKUPS.program, "All Programs");
    fillSelect("#filterCampus", LOOKUPS.campus, "All Campuses");
    fillSelect("#filterSex", LOOKUPS.sex, "All Sexes");

    const s = await getJSON(`${API}/stats/summary`);
    const cards = [
      ["Total Students", s.totalStudents], ["Accounts", s.totalAccounts], ["Programs", s.totalPrograms],
      ["Campuses", s.totalCampuses], ["4Ps Members", s.fourPsMembers], ["PWD", s.pwdStudents],
      ["Avg GPA", s.avgGPA ?? "—"],
    ];
    $("#summaryCards").innerHTML = cards.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

    const [program, sex, campus, region, income] = await Promise.all([
      getJSON(`${API}/stats/by-program`), getJSON(`${API}/stats/by-sex`),
      getJSON(`${API}/stats/by-campus`), getJSON(`${API}/stats/by-region`), getJSON(`${API}/stats/by-income`),
    ]);
    drawChart("chartProgram", "bar", program);
    drawChart("chartSex", "doughnut", sex);
    drawChart("chartCampus", "pie", campus);
    drawChart("chartRegion", "bar", region);
    drawChart("chartIncome", "bar", income);

    await loadStudents();
    dashboardLoaded = true;
  } catch (ex) {
    $("#summaryCards").innerHTML = `<div class="stat" style="grid-column:1/-1;border-left-color:#c0392b;"><div class="k">Error</div><div class="v" style="font-size:1rem;">${ex.message}</div></div>`;
  }
}
function fillSelect(sel, items, allLabel) {
  $(sel).innerHTML = `<option value="">${allLabel}</option>` + items.map((i) => `<option value="${i.id}">${i.name}</option>`).join("");
}
function drawChart(id, type, data) {
  const ctx = $(`#${id}`);
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type,
    data: {
      labels: data.map((d) => d.label),
      datasets: [{
        label: "Students", data: data.map((d) => d.value),
        backgroundColor: type === "bar" ? data.map((_, i) => PALETTE[i % PALETTE.length]) : data.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: "#fff", borderWidth: type === "bar" ? 0 : 2, borderRadius: type === "bar" ? 6 : 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: type !== "bar", position: "right", labels: { boxWidth: 14, font: { size: 11 } } } },
      scales: type === "bar" ? { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { font: { size: 10 } } } } : {},
    },
  });
}

async function loadStudents() {
  const params = new URLSearchParams();
  const v = (id) => $(id).value.trim();
  if (v("#search")) params.set("search", v("#search"));
  if ($("#filterProgram").value) params.set("programId", $("#filterProgram").value);
  if ($("#filterCampus").value) params.set("campusId", $("#filterCampus").value);
  if ($("#filterSex").value) params.set("sexId", $("#filterSex").value);
  const rows = await getJSON(`${API}/students?${params}`);
  $("#studentEmpty").hidden = rows.length > 0;
  const body = $("#studentBody");
  body.innerHTML = rows.map((r) => `
    <tr data-id="${r.GenID}">
      <td>${r.StudentNo}</td>
      <td><b>${r.LName}, ${r.FName}</b> ${r.MName ? r.MName[0] + "." : ""}</td>
      <td>${r.ProgramName}</td><td>${r.CampusName}</td>
      <td>${r.YearSec || "—"}</td><td>${r.SexName || "—"}</td><td>${r.RegionName || "—"}</td>
    </tr>`).join("");
  body.querySelectorAll("tr").forEach((tr) => tr.addEventListener("click", () => openStudent(tr.dataset.id)));
}
let searchTimer;
$("#search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadStudents, 250); });
["#filterProgram", "#filterCampus", "#filterSex"].forEach((s) => $(s).addEventListener("change", loadStudents));
$("#clearFilters").addEventListener("click", () => {
  $("#search").value = ""; $("#filterProgram").value = ""; $("#filterCampus").value = ""; $("#filterSex").value = "";
  loadStudents();
});

// ---------------- STUDENT DETAIL MODAL ----------------
const val = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const row = (l, v) => `<div class="row"><b>${l}</b>${val(v)}</div>`;
function fmtDate(d) { if (!d) return "—"; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }); }

async function openStudent(id) {
  const d = await getJSON(`${API}/students/${id}`);
  const g = d.general, f = d.family, e = d.education, m = d.medical, o = d.other;
  let h = `<div class="profile-head"><h2>${g.FName} ${g.MName || ""} ${g.LName}</h2>
    <div class="sub">${g.StudentNo} · ${val(g.ProgramName)} · ${val(g.CampusName)}</div>
    <div><span class="p-pill">${val(g.YearSec)}</span><span class="p-pill">${val(g.SexName)}</span><span class="p-pill">${val(g.CivilStatus)}</span><span class="p-pill">Age ${val(g.Age)}</span></div></div>`;
  h += `<div class="block"><h4>General Information</h4><div class="kv">
    ${row("Nickname", g.Nickname)}${row("Birthday", fmtDate(g.Birthday))}${row("Birthplace", g.Birthplace)}
    ${row("Citizenship", g.Citizenship)}${row("Religion", g.ReligionName)}${row("Region", g.RegionName)}
    ${row("Languages", g.LanguageSpoken)}${row("Residence", g.Residence)}${row("Semester", g.SemNo)}
    ${row("Academic Year", g.AcadYear)}${row("Contact", g.Contact)}${row("Email", g.Email)}
    ${row("Present Address", g.PresentAdd)}${row("Permanent Address", g.PermanentAdd)}</div></div>`;
  if (f) h += `<div class="block"><h4>Family Background</h4><div class="kv">
    ${row("Parents' Status", f.MartialName)}${row("Living Arrangement", f.LivingName)}${row("Father", f.FName)}
    ${row("Father Occupation", f.Foccupation)}${row("Mother", f.Mname)}${row("Mother Occupation", f.Moccupation)}
    ${row("No. of Siblings", f.NumofSibs)}${row("Birth Order", f.Birthorder)}${row("Household Income", f.IncomeName)}
    ${row("4Ps Member", f.Is4PsMember ? "Yes" : "No")}${row("Finance Source", f.Finance)}</div></div>`;
  if (d.siblings.length) h += `<div class="block"><h4>Siblings</h4><table class="mini-table"><tr><th>Name</th><th>Age</th><th>Occupation/School</th></tr>${d.siblings.map((s) => `<tr><td>${val(s.SibName)}</td><td>${val(s.SibAge)}</td><td>${val(s.SibOccupation)} ${s.SibSC ? "· " + s.SibSC : ""}</td></tr>`).join("")}</table></div>`;
  if (e) h += `<div class="block"><h4>Educational Background</h4><table class="mini-table"><tr><th>Level</th><th>School</th><th>Year</th></tr>
    ${eduRow("Elementary", e.ElemName, e.ElemYear)}${eduRow("Junior High", e.JHName, e.JHYear)}${eduRow("Senior High", e.SHName, e.SHYear)}${eduRow("College", e.CollegeName, e.CollegeYear)}
    </table><div class="kv" style="margin-top:10px;">${row("Awards", e.Awards)}${row("Scholarship", e.Scholar)}</div></div>`;
  if (d.schoolOrgs.length || d.commOrgs.length) {
    h += `<div class="block"><h4>Extracurricular</h4>`;
    if (d.schoolOrgs.length) h += `<table class="mini-table"><tr><th>School Org</th><th>Position</th><th>Year</th></tr>${d.schoolOrgs.map((s) => `<tr><td>${val(s.SOrgName)}</td><td>${val(s.SPosition)}</td><td>${val(s.SYear)}</td></tr>`).join("")}</table>`;
    if (d.commOrgs.length) h += `<table class="mini-table" style="margin-top:8px;"><tr><th>Community Org</th><th>Position</th><th>Year</th></tr>${d.commOrgs.map((c) => `<tr><td>${val(c.COrgName)}</td><td>${val(c.CPosition)}</td><td>${val(c.CYear)}</td></tr>`).join("")}</table>`;
    h += `</div>`;
  }
  if (m) {
    h += `<div class="block"><h4>Medical Information</h4><div class="kv">
      ${row("Height (m)", m.Height)}${row("Weight (kg)", m.Weight)}${row("PWD", m.PWD ? "Yes" : "No")}
      ${row("Disability", m.Disability)}${row("Chronic Condition", m.Chronic)}</div>`;
    if (d.medications.length) h += `<table class="mini-table" style="margin-top:8px;"><tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr>${d.medications.map((x) => `<tr><td>${val(x.MedName)}</td><td>${val(x.Dosage)}</td><td>${val(x.Frequency)}</td></tr>`).join("")}</table>`;
    h += `</div>`;
  }
  if (o) h += `<div class="block"><h4>Other Information</h4><div class="kv">
    ${row("Interests", o.Sinterest)}${row("Skills", o.Skill)}${row("Hobbies", o.Hobbies)}
    ${row("Ambition", o.Ambition)}${row("Motto", o.Motto)}${row("Latest GPA", o.LatestGPA)}${row("Date Filed", fmtDate(o.DateFiled))}</div></div>`;
  $("#modalBody").innerHTML = h;
  $("#modal").hidden = false;
}
function eduRow(level, name, year) { return name ? `<tr><td><b>${level}</b></td><td>${val(name)}</td><td>${val(year)}</td></tr>` : ""; }
$("#modalClose").addEventListener("click", () => ($("#modal").hidden = true));
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("#modal").hidden = true; });

// ---------------- BOOT ----------------
(async function init() {
  showStep(0);
  await refreshAuthUI();
  // if already logged in, jump straight to LMS
  try { await getJSON(`${API}/me`); go("lms"); } catch { go("landing"); }
})();
