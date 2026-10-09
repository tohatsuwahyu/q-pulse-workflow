/**
 * Q-Pulse secure backend for a Google Spreadsheet-bound Apps Script project.
 * Paste this file into Apps Script, save, then redeploy the Web App.
 */
const QP = {
  TASKS: 'Tasks', PROJECTS: 'Projects', MEMBERS: 'Members', SCHEDULES: 'Schedules',
  REPORTS: 'DailyReports', KPI: 'KPI_Monthly', SETTINGS: 'Settings', ALERT_LOG: 'Alert_Log'
};

function doGet(e) {
  const action = (e.parameter.action || 'dashboard').toLowerCase();
  let result;
  if (action === 'setup') result = setup_();
  else if (action === 'dashboard') result = dashboard_();
  else if (action === 'me') result = currentUser_();
  else if (action === 'alerts') result = sendAlerts_();
  else result = {ok:false, error:'Unknown action'};
  return output_(result, e.parameter.callback);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const data = body.data || {};
    const role = requireRole_(['Admin','Manager','Member']);
    if (body.action === 'createTask') {
      append_(QP.TASKS, [newId_('T'), data.name, data.project || 'Ad-hoc', data.owner, data.due, data.priority || 'Medium', data.status || 'Not Started', data.plannedHours || 4, data.emergencyType || '', data.impact || '', new Date(), '']);
    } else if (body.action === 'createProject') {
      requireRole_(['Admin','Manager']);
      append_(QP.PROJECTS, [newId_('P'), data.name, data.leader, data.deadline, 0, 'On Track', data.desc || '', new Date()]);
    } else if (body.action === 'createMember') {
      requireRole_(['Admin','Manager']);
      append_(QP.MEMBERS, [newId_('M'), data.name, data.email, data.role || 'Member', data.capacity || 40, 'TRUE', new Date()]);
    } else if (body.action === 'createSchedule') {
      append_(QP.SCHEDULES, [newId_('S'), data.name, data.date, data.time, data.place || '', data.owner || '', data.project || '']);
    } else if (body.action === 'createReport') {
      append_(QP.REPORTS, [newId_('R'), data.date, currentUser_().email, data.hours || '', data.content || '', data.issues || '', data.tomorrow || '', new Date()]);
    } else if (body.action === 'updateTask') {
      updateRow_(QP.TASKS, 'Task ID', data.id, [data.id, data.name, data.project || 'Ad-hoc', data.owner, data.due, data.priority, data.status, data.plannedHours || 4, data.emergencyType || '', data.impact || '', '', '']);
    } else if (body.action === 'updateProject') {
      requireRole_(['Admin','Manager']);
      updateRow_(QP.PROJECTS, 'Project ID', data.id, [data.id, data.name, data.leader, data.deadline, data.progress || 0, data.health || 'On Track', data.desc || '', '']);
    } else if (body.action === 'updateMember') {
      requireRole_(['Admin','Manager']);
      updateRow_(QP.MEMBERS, 'Member ID', data.id, [data.id, data.name, data.email, data.role || 'Member', data.capacity || 40, data.active === false || data.active === 'FALSE' ? 'FALSE' : 'TRUE', '']);
    } else if (body.action === 'deleteTask') {
      deleteRow_(QP.TASKS, 'Task ID', data.id);
    } else if (body.action === 'deleteProject') {
      requireRole_(['Admin','Manager']);
      deleteRow_(QP.PROJECTS, 'Project ID', data.id);
    } else if (body.action === 'deleteMember') {
      requireRole_(['Admin','Manager']);
      deleteRow_(QP.MEMBERS, 'Member ID', data.id);
    } else throw new Error('Unknown action');
    return output_({ok:true, role:role});
  } catch (err) {
    return output_({ok:false, error:err.message});
  }
}

/** Run once by opening the Web App URL with ?action=setup */
function setup_() {
  const schemas = {};
  schemas[QP.TASKS] = ['Task ID','Task Name','Project','Owner','Due Date','Priority','Status','Planned Hours','Emergency Type','Machine / Line / Impact','Created At','Notes'];
  schemas[QP.PROJECTS] = ['Project ID','Project Name','Leader','Deadline','Progress %','Health','Objective / KPI','Created At'];
  schemas[QP.MEMBERS] = ['Member ID','Name','Email','Role','Capacity Hours / Week','Active','Created At'];
  schemas[QP.SCHEDULES] = ['Schedule ID','Event Name','Date','Time','Location / Link','Owner','Related Project'];
  schemas[QP.REPORTS] = ['Report ID','Work Date','Member Email','Work Hours','Work Details','Issues / Risks','Tomorrow Plan','Submitted At'];
  schemas[QP.KPI] = ['Month','Member','Tasks Completed','On-time Rate','Planned Hours','Capacity Hours','Overload','Reports Submitted','Open Issues'];
  schemas[QP.SETTINGS] = ['Setting','Value','Note'];
  schemas[QP.ALERT_LOG] = ['Sent At','Alert Type','Item ID','Recipient'];
  Object.keys(schemas).forEach(name => ensureSheet_(name, schemas[name]));
  const settings = sheet_(QP.SETTINGS);
  if (settings.getLastRow() < 2) {
    settings.getRange(2,1,4,3).setValues([
      ['Manager Email','', 'Email tujuan alert harian'],
      ['Google Chat Webhook URL','', 'Opsional: URL incoming webhook Google Chat'],
      ['Alert Lead Days','3', 'Alert untuk deadline kurang dari atau sama dengan hari ini'],
      ['Allow Public Demo','FALSE', 'TRUE hanya untuk demo. Production harus FALSE.']
    ]);
  }
  const me = currentUser_();
  if (me.email && !findMember_(me.email)) append_(QP.MEMBERS, [newId_('M'), me.email.split('@')[0], me.email, 'Admin', 40, 'TRUE', new Date()]);
  return {ok:true, message:'Q-Pulse sheets are ready. Add company emails and roles in Members.'};
}

function dashboard_() {
  return {ok:true, tasks:rows_(QP.TASKS), projects:rows_(QP.PROJECTS), members:rows_(QP.MEMBERS), schedules:rows_(QP.SCHEDULES), workload:workload_(), profile:currentUser_()};
}
function currentUser_() {
  const email = Session.getActiveUser().getEmail() || '';
  const member = email ? findMember_(email) : null;
  return {email:email, role:member ? member.Role : 'Guest', authenticated:!!email};
}
function requireRole_(roles) {
  const profile = currentUser_();
  const isDemo = String(setting_('Allow Public Demo')).toUpperCase() === 'TRUE';
  if (isDemo) return 'Demo';
  if (!profile.authenticated) throw new Error('Login Google Workspace diperlukan. Deploy Web App untuk pengguna domain perusahaan.');
  if (!roles.includes(profile.role)) throw new Error('Anda tidak memiliki izin untuk aksi ini. Role Anda: '+profile.role);
  return profile.role;
}
function workload_() {
  const tasks = rows_(QP.TASKS).filter(t => t.Status !== 'Done');
  return rows_(QP.MEMBERS).filter(m=>String(m.Active).toUpperCase() !== 'FALSE').map(m => {
    const planned = tasks.filter(t => t.Owner === m.Name).reduce((n,t)=>n+(Number(t['Planned Hours'])||4),0);
    const capacity = Number(m['Capacity Hours / Week']) || 40;
    return {name:m.Name, email:m.Email, role:m.Role, plannedHours:planned, capacityHours:capacity, overload:planned > capacity};
  });
}

/** Run once manually, then create a daily time trigger for this function. */
function sendAlerts_() {
  const lead = Number(setting_('Alert Lead Days')) || 3;
  const today = new Date(); today.setHours(0,0,0,0);
  const messages = [];
  rows_(QP.TASKS).filter(t => t.Status !== 'Done' && t['Due Date']).forEach(t => {
    const due = new Date(t['Due Date']); due.setHours(0,0,0,0);
    const days = Math.ceil((due-today)/86400000);
    if (days <= lead) messages.push('Task '+t['Task ID']+' — '+t['Task Name']+' (due '+formatDate_(due)+', '+days+' day(s))');
  });
  rows_(QP.PROJECTS).filter(p => p.Health === 'At Risk').forEach(p => messages.push('AT RISK project: '+p['Project Name']+' (deadline '+formatDate_(p.Deadline)+')'));
  if (!messages.length) return {ok:true, sent:false, message:'No alert conditions today.'};
  const text = 'Q-Pulse alert\n\n' + messages.join('\n');
  const email = setting_('Manager Email');
  if (email) MailApp.sendEmail(email, 'Q-Pulse: deadline / project alert', text);
  const webhook = setting_('Google Chat Webhook URL');
  if (webhook) UrlFetchApp.fetch(webhook, {method:'post', contentType:'application/json', payload:JSON.stringify({text:text}), muteHttpExceptions:true});
  append_(QP.ALERT_LOG, [new Date(), 'Daily deadline / risk alert', messages.join(' | '), email || 'Google Chat only']);
  return {ok:true, sent:true, count:messages.length};
}
function createDailyAlertTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendAlerts_').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendAlerts_').timeBased().everyDays(1).atHour(8).create();
}
function ensureSheet_(name, headers) {
  const sh = sheet_(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  } else {
    const current = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getValues()[0];
    headers.forEach((h,i)=>{if(current[i] !== h) sh.getRange(1,i+1).setValue(h);});
  }
  sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#5856D6').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
}
function sheet_(name) { const ss=SpreadsheetApp.getActive(); return ss.getSheetByName(name) || ss.insertSheet(name); }
function rows_(name) { const sh=sheet_(name); if(sh.getLastRow()<2) return []; const all=sh.getDataRange().getValues(); const h=all.shift(); return all.filter(r=>r.some(v=>v!=='' )).map(r=>h.reduce((o,k,i)=>(o[k]=r[i],o),{})); }
function append_(name, row) { sheet_(name).appendRow(row); }
function updateRow_(sheetName, idHeader, id, row) {
  const sh = sheet_(sheetName), values = sh.getDataRange().getValues(), headers = values[0], col = headers.indexOf(idHeader);
  if (col < 0) throw new Error('Missing ID column: '+idHeader);
  const index = values.findIndex((r,i)=>i>0 && String(r[col]) === String(id));
  if (index < 1) throw new Error('Record not found: '+id);
  sh.getRange(index+1, 1, 1, row.length).setValues([row]);
}
function deleteRow_(sheetName, idHeader, id) {
  const sh = sheet_(sheetName), values = sh.getDataRange().getValues(), col = values[0].indexOf(idHeader);
  const index = values.findIndex((r,i)=>i>0 && String(r[col]) === String(id));
  if (index < 1) throw new Error('Record not found: '+id);
  sh.deleteRow(index+1);
}
function findMember_(email) { return rows_(QP.MEMBERS).find(m => String(m.Email).toLowerCase() === String(email).toLowerCase() && String(m.Active).toUpperCase() !== 'FALSE'); }
function setting_(key) { const row=rows_(QP.SETTINGS).find(x=>x.Setting===key); return row ? row.Value : ''; }
function newId_(prefix) { return prefix+'-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd-HHmmss'); }
function formatDate_(d) { return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd'); }
function output_(data, callback) {
  const text = callback ? callback+'('+JSON.stringify(data)+')' : JSON.stringify(data);
  return ContentService.createTextOutput(text).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
