const KEY="kuliah-app-v1";
const defaults={schedule:[
{id:"s1",day:1,start:"08:00",end:"09:40",course:"Analisis dan Perancangan Sistem",room:"A303",lecturer:"Dosen",credits:3},
{id:"s2",day:2,start:"10:00",end:"11:40",course:"Basis Data",room:"A305",lecturer:"Dosen",credits:3}
],tasks:[],groups:[]};
let data=load(), currentView="schedule", taskFilter="all", editType=null, editId=null, deferredPrompt=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));$("#saveStatus").textContent="Tersimpan "+new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}
const days=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function render(){
 renderSchedule();renderTasks();renderGroups();updateClock();
}
function renderSchedule(){
 const arr=[...data.schedule].sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start));
 $("#scheduleList").innerHTML=arr.length?arr.map(x=>`<article class="card" data-id="${x.id}">
<div class="card-top"><div><div class="badge">${days[x.day]}</div><div class="title" style="margin-top:7px">${esc(x.course)}</div><div class="meta">🕐 ${x.start}–${x.end} · 📍 ${esc(x.room||"-")} · ${x.credits||0} SKS<br>👨‍🏫 ${esc(x.lecturer||"-")}</div></div></div>
<div class="actions"><button class="small" data-edit-schedule="${x.id}">Edit</button><button class="small danger" data-delete-schedule="${x.id}">Hapus</button></div></article>`).join(""):'<div class="empty">Belum ada jadwal. Tambahkan jadwal pertama kamu.</div>';
}
function renderTasks(){
 let arr=[...data.tasks].sort((a,b)=>a.deadline.localeCompare(b.deadline));
 if(taskFilter!=="all")arr=arr.filter(x=>x.status===taskFilter);
 $("#taskList").innerHTML=arr.length?arr.map(x=>`<article class="card">
<div class="card-top"><div><div class="title">${esc(x.title)}</div><div class="meta">${esc(x.course||"Tanpa mata kuliah")} · Deadline ${esc(formatDate(x.deadline))}<br>${x.type==="group"?"👥 Kelompok":"👤 Individu"}${x.group?" · "+esc(x.group):""}</div></div><span class="badge ${x.status==="done"?"done":x.status==="progress"?"progress":""}">${statusLabel(x.status)}</span></div>
<div class="actions"><button class="small" data-edit-task="${x.id}">Edit</button><button class="small" data-status-task="${x.id}">${x.status==="done"?"Buka kembali":"Tandai selesai"}</button><button class="small danger" data-delete-task="${x.id}">Hapus</button></div></article>`).join(""):'<div class="empty">Tidak ada tugas pada filter ini.</div>';
}
function renderGroups(){
 $("#groupList").innerHTML=data.groups.length?data.groups.map(x=>`<article class="card"><div class="title">${esc(x.name)}</div><div class="meta">Mata kuliah: ${esc(x.course||"-")}<br>Anggota: ${esc(x.members||"-")}<br>Catatan: ${esc(x.note||"-")}</div><div class="actions"><button class="small" data-edit-group="${x.id}">Edit</button><button class="small danger" data-delete-group="${x.id}">Hapus</button></div></article>`).join(""):'<div class="empty">Belum ada kelompok.</div>';
}
function statusLabel(s){return s==="done"?"Selesai":s==="progress"?"Proses":"Belum mulai"}
function formatDate(v){if(!v)return"-";return new Date(v+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}
function updateClock(){
 const now=new Date();$("#dateText").textContent=now.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});$("#clock").textContent=now.toLocaleTimeString("id-ID",{hour12:false});
 const day=now.getDay(), mins=now.getHours()*60+now.getMinutes(), todays=data.schedule.filter(x=>x.day===day).sort((a,b)=>a.start.localeCompare(b.start));
 let active=todays.find(x=>mins>=toMin(x.start)&&mins<toMin(x.end)), next=todays.find(x=>toMin(x.start)>mins);
 if(active){$("#nextClass").textContent=`Sedang berlangsung · ${active.course}`;$("#countdown").textContent=`Selesai ${diffText(toMin(active.end)-mins)}`;document.querySelectorAll("#scheduleList .card").forEach(c=>c.classList.toggle("active",c.dataset.id===active.id))}
 else if(next){$("#nextClass").textContent=`Berikutnya · ${next.course} (${next.start})`;$("#countdown").textContent=`Mulai ${diffText(toMin(next.start)-mins)}`}
 else{$("#nextClass").textContent="Tidak ada kuliah lagi hari ini";$("#countdown").textContent="—"}
}
function toMin(s){const [h,m]=s.split(":").map(Number);return h*60+m}
function diffText(m){return m<60?`${m} menit lagi`:`${Math.floor(m/60)}j ${m%60}m lagi`}
setInterval(updateClock,1000);

function openModal(type,id=null){
 editType=type;editId=id;const existing=id?(data[type==="schedule"?"schedule":type==="task"?"tasks":"groups"].find(x=>x.id===id)||{}):{};
 $("#modalTitle").textContent=(id?"Edit ":"Tambah ")+(type==="schedule"?"Jadwal":type==="task"?"Tugas":"Kelompok");
 let f="";
 if(type==="schedule")f=`<div class="form-grid">
${field("Mata kuliah","course",existing.course||"")}
<div class="form-grid" style="grid-template-columns:1fr 1fr">${field("Hari","day",existing.day??1,"select",days.slice(1).map((d,i)=>[i+1,d]))}${field("SKS","credits",existing.credits||3,"number")}</div>
<div class="form-grid" style="grid-template-columns:1fr 1fr">${field("Mulai","start",existing.start||"08:00","time")}${field("Selesai","end",existing.end||"09:40","time")}</div>
${field("Ruang","room",existing.room||"")}${field("Dosen","lecturer",existing.lecturer||"")}
</div>`;
 if(type==="task")f=`<div class="form-grid">${field("Nama tugas","title",existing.title||"")}${field("Mata kuliah","course",existing.course||"")}${field("Deadline","deadline",existing.deadline||new Date().toISOString().slice(0,10),"date")}${field("Jenis","type",existing.type||"individual","select",[["individual","Individu"],["group","Kelompok"]])}${field("Kelompok (opsional)","group",existing.group||"")}${field("Status","status",existing.status||"todo","select",[["todo","Belum mulai"],["progress","Proses"],["done","Selesai"]])}${field("Catatan","note",existing.note||"","textarea")}</div>`;
 if(type==="groups")f=`<div class="form-grid">${field("Nama kelompok","name",existing.name||"")}${field("Mata kuliah","course",existing.course||"")}${field("Anggota","members",existing.members||"","textarea")}${field("Catatan","note",existing.note||"","textarea")}</div>`;
 $("#modalForm").innerHTML=f+`<div class="form-actions"><button type="button" class="secondary" id="cancelForm">Batal</button><button class="primary">Simpan</button></div>`;
 $("#modal").classList.remove("hidden");$("#modalForm").querySelector("input,select,textarea")?.focus();
}
function field(label,name,value,type="text",options=[]){if(type==="select")return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o=>`<option value="${o[0]}" ${String(o[0])===String(value)?"selected":""}>${o[1]}</option>`).join("")}</select></div>`;return `<div class="field"><label>${label}</label>${type==="textarea"?`<textarea name="${name}">${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${name==="credits"?"min=1 max=10":""} required>`}</div>`}
$("#modalForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.target),obj=Object.fromEntries(fd.entries());if(editType==="schedule"){obj.day=+obj.day;obj.credits=+obj.credits;upsert(data.schedule,obj)}else if(editType==="task")upsert(data.tasks,obj);else upsert(data.groups,obj);save();$("#modal").classList.add("hidden");render()});
function upsert(arr,obj){if(editId){const i=arr.findIndex(x=>x.id===editId);obj.id=editId;arr[i]=obj}else{obj.id=crypto.randomUUID();arr.push(obj)}}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");document.addEventListener("click",e=>{if(e.target.id==="cancelForm")$("#modal").classList.add("hidden")});
$("#addScheduleBtn").onclick=()=>openModal("schedule");$("#addTaskBtn").onclick=()=>openModal("task");$("#addGroupBtn").onclick=()=>openModal("groups");
document.addEventListener("click",e=>{
 const t=e.target;
 if(t.dataset.editSchedule)openModal("schedule",t.dataset.editSchedule);
 if(t.dataset.deleteSchedule){data.schedule=data.schedule.filter(x=>x.id!==t.dataset.deleteSchedule);save();render()}
 if(t.dataset.editTask)openModal("task",t.dataset.editTask);
 if(t.dataset.deleteTask){data.tasks=data.tasks.filter(x=>x.id!==t.dataset.deleteTask);save();render()}
 if(t.dataset.statusTask){const x=data.tasks.find(x=>x.id===t.dataset.statusTask);x.status=x.status==="done"?"progress":"done";save();render()}
 if(t.dataset.editGroup)openModal("groups",t.dataset.editGroup);
 if(t.dataset.deleteGroup){data.groups=data.groups.filter(x=>x.id!==t.dataset.deleteGroup);save();render()}
});
$$(".tab").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;$$(".tab").forEach(x=>x.classList.toggle("active",x===b));$$(".view").forEach(v=>v.classList.add("hidden"));$("#"+currentView+"View").classList.remove("hidden")});
$$(".filter").forEach(b=>b.onclick=()=>{taskFilter=b.dataset.filter;$$(".filter").forEach(x=>x.classList.toggle("active",x===b));renderTasks()});
$("#notifyBtn").onclick=async()=>{if(!("Notification"in window)){alert("Browser ini tidak mendukung notifikasi.");return}const p=await Notification.requestPermission();if(p==="granted"){new Notification("Kuliah App",{body:"Notifikasi berhasil diaktifkan."});$("#notifyBtn").textContent="✓ Notifikasi Aktif"}else alert("Izin notifikasi belum diberikan.")};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").classList.add("hidden")};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
render();
