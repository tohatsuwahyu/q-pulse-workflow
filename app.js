const API_URL="https://script.google.com/macros/s/AKfycbw2FH90KLUbPNrWS8PILmkUS9ml5-fnFkslfc4yeHJ7e9QfP2ST-MgAOKRsRz9M1GH_Ow/exec";
const state={tasks:[],projects:[],members:[],reports:[],editing:null};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?String(v||""):d.toISOString().slice(0,10)};
const JA={
  priority:{Critical:"最優先",High:"高",Medium:"中",Low:"低"},
  status:{"Not Started":"未着手","In Progress":"進行中",Done:"完了"},
  health:{"On Track":"順調","At Risk":"要注意"},
  role:{Admin:"管理者",Manager:"マネージャー",Member:"メンバー"},
  emergency:{"":"なし","Machine breakdown":"設備故障","Quality defect":"品質不良","Safety risk":"安全リスク","Production stop":"生産停止"}
};
const label=(type,value)=>JA[type]?.[value]??value??"";
function toast(text){const e=$("#toast");e.textContent=text;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)}
function jsonp(action){return new Promise((resolve,reject)=>{const cb="qp_"+Date.now()+"_"+Math.random().toString(36).slice(2),s=document.createElement("script"),timer=setTimeout(()=>done(new Error("timeout")),10000);function done(err,data){clearTimeout(timer);delete window[cb];s.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);s.onerror=()=>done(new Error("connection"));s.src=API_URL+"?action="+action+"&callback="+cb;document.head.append(s)})}
function post(action,data){return fetch(API_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,data})})}
function status(s){return '<span class="status '+esc(String(s).toLowerCase().replaceAll(" ","-"))+'">'+esc(label("status",s))+"</span>"}
function priority(p){return '<span class="badge '+esc(String(p).toLowerCase())+'">'+esc(label("priority",p))+"</span>"}
function renderAll(){renderDashboard();renderTasks();renderProjects();renderMembers()}
function renderDashboard(){
 const open=state.tasks.filter(x=>x.status!=="Done"),week=open.filter(x=>x.due<="2026-10-15");
 $("#openTaskCount").textContent=open.length;$("#dueCount").textContent=week.length;
 const mc=$("#memberCount");if(mc)mc.textContent=state.members.filter(m=>m.active!==false).length;
 $("#priorityTaskList").innerHTML=open.slice(0,4).map(x=>'<div class="task-row"><i class="task-bar '+esc(x.priority.toLowerCase())+'"></i><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.project)+" ・ "+esc(x.owner)+" ・ "+esc(x.due)+" ・ "+(Number(x.plannedHours)||4)+"時間</small></div>"+priority(x.priority)+"</div>").join("")||"<p class='muted'>未完了のタスクはありません。</p>";
 $("#projectList").innerHTML=state.projects.map(x=>'<div class="project-item '+(x.health==="At Risk"?"danger":"")+'"><div class="project-meta"><b>'+esc(x.name)+'</b><small>'+x.progress+'%</small></div><div class="progress"><span style="width:'+x.progress+'%"></span></div><div class="project-meta"><small>'+esc(x.deadline)+'</small><b>'+esc(label("health",x.health))+'</b></div></div>').join("")||"<p class='muted'>プロジェクトはありません。</p>";
 const days=["月","火","水","木","金"],people=state.members.filter(m=>m.active!==false);
 $("#heatmap").innerHTML="<span></span>"+days.map(d=>"<span>"+d+"</span>").join("")+people.map(m=>{const h=open.filter(t=>t.owner===m.name).reduce((n,t)=>n+(Number(t.plannedHours)||4),0),cap=Number(m.capacity)||40,l=Math.max(1,Math.min(4,Math.ceil(h/(cap*.25))));return "<span title='"+h+"時間 / "+cap+"時間'>"+esc(m.name)+"</span>"+days.map((_,i)=>"<i class='l"+(i?Math.max(1,l-1):l)+"'></i>").join("")}).join("")||"<p class='muted'>メンバーを登録してください。</p>";
}
function renderTasks(){
 const q=$("#taskSearch").value.toLowerCase(),f=$("#statusFilter").value;
 const list=state.tasks.filter(x=>(!q||Object.values(x).join(" ").toLowerCase().includes(q))&&(!f||x.status===f));
 $("#taskTable").innerHTML=list.map(x=>"<tr><td><b>"+esc(x.name)+"</b><br><small>"+esc(x.id)+(x.emergencyType?" ・ ⚠ "+esc(label("emergency",x.emergencyType)):"")+"</small></td><td>"+esc(x.project)+"</td><td>"+esc(x.owner)+"</td><td>"+esc(x.due)+"<br><small>"+(Number(x.plannedHours)||4)+"時間</small></td><td>"+priority(x.priority)+"</td><td>"+status(x.status)+"</td><td><button class='text-btn' data-edit='task' data-id='"+esc(x.id)+"'>編集</button> <button class='text-btn danger-btn' data-delete='task' data-id='"+esc(x.id)+"'>削除</button></td></tr>").join("")||"<tr><td colspan='7'>タスクはありません。</td></tr>";
 bindRowActions();
}
function renderProjects(){$("#projectCards").innerHTML=state.projects.map(x=>"<article class='panel project-card'><span class='status "+(x.health==="At Risk"?"not-started":"done")+"'>"+esc(label("health",x.health))+"</span><h3>"+esc(x.name)+"</h3><p>"+esc(x.desc)+"</p><div class='progress'><span style='width:"+x.progress+"%'></span></div><div class='card-footer'><span>進捗 "+x.progress+"%</span><span>"+esc(x.deadline)+"</span></div><div class='card-footer'><span>責任者: "+esc(x.leader)+"</span><span><button class='text-btn' data-edit='project' data-id='"+esc(x.id)+"'>編集</button> <button class='text-btn danger-btn' data-delete='project' data-id='"+esc(x.id)+"'>削除</button></span></div></article>").join("")||"<p class='muted'>プロジェクトはありません。</p>";bindRowActions()}
function renderMembers(){const body=$("#memberTable");if(!body)return;const open=state.tasks.filter(x=>x.status!=="Done");body.innerHTML=state.members.map(m=>{const work=open.filter(t=>t.owner===m.name).reduce((n,t)=>n+(Number(t.plannedHours)||4),0),cap=Number(m.capacity)||40;return "<tr><td><b>"+esc(m.name)+"</b><br><small>"+esc(m.email)+"</small></td><td>"+esc(label("role",m.role))+"</td><td>"+cap+"時間</td><td>"+work+"時間</td><td>"+(work>cap?"<span class='badge high'>過負荷</span>":"<span class='badge low'>適正</span>")+"</td><td><button class='text-btn' data-edit='member' data-id='"+esc(m.id)+"'>編集</button> <button class='text-btn danger-btn' data-delete='member' data-id='"+esc(m.id)+"'>削除</button></td></tr>"}).join("")||"<tr><td colspan='6'>メンバーはありません。</td></tr>";bindRowActions()}
function bindRowActions(){$$("[data-edit]").forEach(b=>b.onclick=()=>openForm(b.dataset.edit,b.dataset.id));$$("[data-delete]").forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete,b.dataset.id))}
function input(labelText,name,value="",type="text",required=true){return "<div class='field'><label>"+labelText+"</label><input name='"+name+"' type='"+type+"' value='"+esc(value)+"' "+(required?"required":"")+"></div>"}
function select(labelText,name,values,value){return "<div class='field'><label>"+labelText+"</label><select name='"+name+"'>"+values.map(v=>{const actual=typeof v==="string"?v:v.value,text=typeof v==="string"?v:v.label;return "<option value='"+esc(actual)+"' "+(actual===value?"selected":"")+">"+esc(text)+"</option>"}).join("")+"</select></div>"}
const choices=(type,values)=>values.map(value=>({value,label:label(type,value)}));
function formHtml(type,x={}){
 if(type==="task")return input("タスク名","name",x.name)+input("プロジェクト","project",x.project||"Ad-hoc")+select("担当者","owner",state.members.map(m=>m.name),x.owner||state.members[0]?.name||"")+input("期限","due",x.due||"","date")+input("予定工数（時間）","plannedHours",x.plannedHours||4,"number")+select("優先度","priority",choices("priority",["Critical","High","Medium","Low"]),x.priority||"Medium")+select("状態","status",choices("status",["Not Started","In Progress","Done"]),x.status||"Not Started")+select("緊急対応の種類","emergencyType",choices("emergency",["","Machine breakdown","Quality defect","Safety risk","Production stop"]),x.emergencyType||"")+input("設備・ライン・影響内容","impact",x.impact||"","text",false);
 if(type==="project")return input("プロジェクト名","name",x.name)+input("責任者","leader",x.leader||state.members[0]?.name||"")+input("期限","deadline",x.deadline||"","date")+input("進捗率（%）","progress",x.progress??0,"number")+select("健全性","health",choices("health",["On Track","At Risk"]),x.health||"On Track")+input("目的・KPI","desc",x.desc||"");
 if(type==="member")return input("氏名","name",x.name)+input("会社メールアドレス","email",x.email,"email")+select("役割","role",choices("role",["Member","Manager","Admin"]),x.role||"Member")+input("週の作業可能時間","capacity",x.capacity||40,"number")+select("在籍状況","active",[{value:"TRUE",label:"有効"},{value:"FALSE",label:"無効"}],x.active===false?"FALSE":"TRUE");
 if(type==="report")return input("作業日","date",x.date||new Date().toISOString().slice(0,10),"date")+input("作業時間","hours",x.hours||8,"number")+"<div class='field'><label>作業内容・問題・明日の予定</label><textarea name='content' required>"+esc(x.content||"")+"</textarea></div>";
}
function openForm(type,id){
 const emergency=type==="emergency";if(emergency){type="task";id=null}
 const collection=type==="task"?state.tasks:type==="project"?state.projects:type==="member"?state.members:state.reports;
 const item=id?collection.find(x=>x.id===id):(emergency?{priority:"Critical",status:"In Progress",emergencyType:"Machine breakdown",plannedHours:4}:{});
 state.editing={type,id};
 const title={task:"タスク",project:"プロジェクト",member:"メンバー",report:"作業日報"}[type];
 $("#modalTitle").textContent=emergency?"緊急対応の登録":(id?"編集：":"新規登録：")+title;
 $("#modalFields").innerHTML=formHtml(type,item);$("#entryModal").showModal();
}
async function saveModal(e){e.preventDefault();const data=Object.fromEntries(new FormData($("#entryForm")).entries()),{type,id}=state.editing||{};if(!type)return;
 const collection=type==="task"?state.tasks:type==="project"?state.projects:type==="member"?state.members:state.reports;
 const record=type==="task"?{id:id||"T-"+Date.now(),...data,plannedHours:Number(data.plannedHours||4)}:type==="project"?{id:id||"P-"+Date.now(),...data,progress:Number(data.progress||0)}:type==="member"?{id:id||"M-"+Date.now(),...data,capacity:Number(data.capacity||40),active:data.active!=="FALSE"}:{id:id||"R-"+Date.now(),...data};
 if(id){const i=collection.findIndex(x=>x.id===id);collection[i]=record;post("update"+type[0].toUpperCase()+type.slice(1),record)}else{collection.unshift(record);post("create"+type[0].toUpperCase()+type.slice(1),record)}
 $("#entryModal").close();state.editing=null;renderAll();toast("保存しました。")}
function deleteItem(type,id){const name=(type==="task"?state.tasks:type==="project"?state.projects:state.members).find(x=>x.id===id)?.name||"この項目";if(!confirm("「"+name+"」を削除しますか？"))return;const key=type==="task"?"tasks":type==="project"?"projects":"members";state[key]=state[key].filter(x=>x.id!==id);post("delete"+type[0].toUpperCase()+type.slice(1),{id});renderAll();toast("削除しました。")}
async function load(){try{const d=await jsonp("dashboard");if(Array.isArray(d.tasks))state.tasks=d.tasks.map(x=>({id:x["Task ID"],name:x["Task Name"],project:x.Project,owner:x.Owner,due:fmt(x["Due Date"]),priority:x.Priority,status:x.Status,plannedHours:Number(x["Planned Hours"])||4,emergencyType:x["Emergency Type"],impact:x["Machine / Line / Impact"]}));if(Array.isArray(d.projects))state.projects=d.projects.map(x=>({id:x["Project ID"],name:x["Project Name"],leader:x.Leader,deadline:fmt(x.Deadline),progress:Number(x["Progress %"])||0,health:x.Health,desc:x["Objective / KPI"]}));if(Array.isArray(d.members))state.members=d.members.map(x=>({id:x["Member ID"],name:x.Name,email:x.Email,role:x.Role,capacity:Number(x["Capacity Hours / Week"])||40,active:String(x.Active)!=="FALSE"}));renderAll()}catch(_){toast("バックエンドに接続できません。設定を確認してください。")}}
window.openQpForm=(type)=>openForm(type);
document.addEventListener("DOMContentLoaded",()=>{$("#today").textContent=new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"long"});renderAll();load();$("#entryForm").addEventListener("submit",saveModal);Array.from(document.querySelectorAll("#cancelBtn,#cancelBtn2")).forEach(b=>b.onclick=()=>{$("#entryModal").close();state.editing=null});$("#taskSearch").oninput=renderTasks;$("#statusFilter").onchange=renderTasks;$$("[data-view]").forEach(b=>b.onclick=()=>{$$("[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".view").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.view).classList.add("active")});$$("[data-new]").forEach(b=>b.onclick=()=>openForm(b.dataset.new));$("#saveReport").onclick=()=>openForm("report");});