/* Q-Pulse connection, roles, workload, and emergency-work extension. */
function qPulseJsonp(action) {
  return new Promise((resolve, reject) => {
    const callback = "qPulse_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timeout = setTimeout(() => finish(new Error("Backend timeout")), 12000);
    function finish(error, data) {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error("Backend connection failed"));
    script.src = API_URL + "?action=" + encodeURIComponent(action) + "&callback=" + callback;
    document.head.appendChild(script);
  });
}
function qPulseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value || "") : d.toISOString().slice(0, 10);
}
function qPulsePost(action, data) {
  return fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify({action, data})
  });
}
function qPulseHeatmap() {
  const days = ["Mon","Tue","Wed","Thu","Fri"];
  const people = (state.members || []).filter(m => m.active !== false);
  $("#heatmap").innerHTML = "<span></span>" + days.map(d => "<span>" + d + "</span>").join("") +
    people.map(m => {
      const work = state.tasks.filter(t => t.owner === m.name && t.status !== "Done")
        .reduce((sum, t) => sum + (Number(t.plannedHours) || 4), 0);
      const capacity = Number(m.capacity) || 40;
      const level = Math.max(1, Math.min(4, Math.ceil(work / (capacity * .25))));
      return "<span title='" + work + "h / " + capacity + "h'>" + m.name + "</span>" +
        days.map((_, i) => "<i class='l" + (i === 0 ? level : Math.max(1, level - 1)) + "'></i>").join("");
    }).join("");
}
function renderDashboard() {
  $("#openTaskCount").textContent = state.tasks.filter(x => x.status !== "Done").length;
  $("#dueCount").textContent = state.tasks.filter(x => x.status !== "Done" && x.due <= "2026-10-15").length;
  $("#priorityTaskList").innerHTML = state.tasks.filter(x => x.status !== "Done").slice(0,3).map(x =>
    "<div class='task-row'><i class='task-bar " + x.priority.toLowerCase() + "'></i><div><strong>" + x.name +
    "</strong><small>" + x.project + " · " + x.owner + " · " + x.due + "</small></div>" + badgePriority(x.priority) + "</div>"
  ).join("");
  qPulseHeatmap();
  $("#projectList").innerHTML = state.projects.map(x =>
    "<div class='project-item " + (x.health === "At Risk" ? "danger" : "") + "'><div class='project-meta'><b>" + x.name +
    "</b><small>" + x.progress + "%</small></div><div class='progress'><span style='width:" + x.progress +
    "%'></span></div><div class='project-meta'><small>" + x.deadline + "</small><b>" + x.health + "</b></div></div>"
  ).join("");
}
async function loadFromApi() {
  if (!API_URL) return;
  try {
    const data = await qPulseJsonp("dashboard");
    if (data.tasks) state.tasks = data.tasks.map(x => ({
      id:x["Task ID"], name:x["Task Name"], project:x.Project, owner:x.Owner, due:qPulseDate(x["Due Date"]),
      priority:x.Priority || "Medium", status:x.Status || "Not Started", plannedHours:Number(x["Planned Hours"]) || 4
    }));
    if (data.projects) state.projects = data.projects.map(x => ({
      id:x["Project ID"], name:x["Project Name"], leader:x.Leader, deadline:qPulseDate(x.Deadline),
      progress:Number(x["Progress %"]) || 0, health:x.Health || "On Track", desc:x["Objective / KPI"] || ""
    }));
    if (data.members) state.members = data.members.map(x => ({
      id:x["Member ID"], name:x.Name, email:x.Email, role:x.Role, capacity:Number(x["Capacity Hours / Week"]) || 40,
      active:String(x.Active).toUpperCase() !== "FALSE"
    }));
    renderAll();
  } catch (error) {
    console.warn(error);
    showToast("Backend belum terbaca. Cek deployment Apps Script.");
  }
}
const qPulseOriginalOpenModal = openModal;
function openModal(type) {
  if (type !== "emergency" && type !== "member") return qPulseOriginalOpenModal(type);
  const modal = $("#entryModal"), fields = $("#modalFields");
  if (type === "emergency") {
    qPulseOriginalOpenModal("task");
    setTimeout(() => {
      $("#modalTitle").textContent = "緊急対応 / Emergency";
      fields.insertAdjacentHTML("afterbegin", "<div class='field'><label>Emergency type</label><select name='emergencyType'><option>Machine breakdown</option><option>Quality defect</option><option>Safety risk</option><option>Production stop</option></select></div><div class='field'><label>Machine / line / impact</label><input name='impact' required placeholder='例: MC-02, Line A, 生産停止'></div><div class='field'><label>Planned hours</label><input name='plannedHours' type='number' value='4' required></div>");
      const p = fields.querySelector("select[name=priority]");
      const st = fields.querySelector("select[name=status]");
      if (p) p.value = "High"; if (st) st.value = "In Progress";
    }, 0);
  } else {
    $("#modalTitle").textContent = "新規メンバー / New member";
    fields.innerHTML = "<div class='field'><label>Name</label><input name='name' required></div><div class='field'><label>Company email</label><input name='email' type='email' required></div><div class='field'><label>Role</label><select name='role'><option>Member</option><option>Manager</option><option>Admin</option></select></div><div class='field'><label>Capacity hours / week</label><input name='capacity' type='number' value='40' required></div>";
    $("#modalSave").onclick = async () => {
      const data = Object.fromEntries(new FormData(modal.querySelector("form")).entries());
      state.members.push({id:"M-"+Date.now(), ...data, capacity:Number(data.capacity), active:true});
      qPulsePost("createMember", data);
      renderAll(); renderMemberView(); showToast("Member disimpan"); modal.close();
    };
    modal.showModal();
  }
}
function renderMemberView() {
  const body = $("#memberTable");
  if (!body) return;
  const workload = state.members.map(m => ({
    ...m, planned:state.tasks.filter(t => t.owner === m.name && t.status !== "Done").reduce((n,t)=>n+(Number(t.plannedHours)||4),0)
  }));
  body.innerHTML = workload.map(m => "<tr><td><b>" + m.name + "</b><br><small>" + m.email + "</small></td><td>" + m.role +
    "</td><td>" + m.capacity + "h</td><td>" + m.planned + "h</td><td>" +
    (m.planned > m.capacity ? "<span class='badge high'>OVERLOAD</span>" : "<span class='badge low'>OK</span>") + "</td></tr>").join("");
}
async function qPulseLoadProfile() {
  try {
    const me = await qPulseJsonp("me");
    const holder = document.querySelector(".header-actions");
    if (holder && me.email) {
      const chip = document.createElement("span");
      chip.className = "status done";
      chip.textContent = me.role + " · " + me.email;
      holder.prepend(chip);
    }
  } catch (_) {}
}
document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector(".hero");
  if (hero) {
    const b = document.createElement("button");
    b.className = "secondary";
    b.textContent = "⚠ 緊急対応";
    b.onclick = () => openModal("emergency");
    hero.appendChild(b);
  }
  const nav = document.querySelector(".sidebar nav");
  const main = document.querySelector("main");
  if (nav && main) {
    const n = document.createElement("button");
    n.className = "nav-item"; n.innerHTML = "<span>♙</span><span>メンバー</span>";
    n.onclick = () => {
      document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active")); n.classList.add("active");
      document.querySelectorAll(".view").forEach(x => x.classList.remove("active")); $("#members").classList.add("active"); renderMemberView();
    };
    nav.appendChild(n);
    const section = document.createElement("section");
    section.id = "members"; section.className = "view";
    section.innerHTML = "<div class='view-title'><div><h2>メンバー / Members</h2><p>役割・稼働時間・作業負荷を管理</p></div><button class='primary' id='newMember'>＋ メンバー追加</button></div><div class='panel table-wrap'><table><thead><tr><th>Name</th><th>Role</th><th>Capacity</th><th>Planned work</th><th>Status</th></tr></thead><tbody id='memberTable'></tbody></table></div>";
    main.appendChild(section);
    $("#newMember").onclick = () => openModal("member");
  }
  qPulseLoadProfile();
});
