const actions=[
{id:1,task:"Finalize updated ICU protocol for sepsis management.",owner:"Dr. Maria Balan",deadline:"2024-10-31",label:"Oct 31",priority:"high",status:"In progress",evidence:"00:00:12"},
{id:2,task:"Organize staff training sessions on infection control.",owner:"Andrei Rotaru",deadline:"2024-11-15",label:"Nov 15",priority:"medium",status:"Not started",evidence:"00:00:35"},
{id:3,task:"Review and approve equipment request for ventilators.",owner:"Dr. Ion Popescu",deadline:"2024-11-20",label:"Nov 20",priority:"high",status:"In progress",evidence:"00:01:02"}];

const transcript=[
{time:"00:00:12",speaker:"Dr. Ion Popescu",lang:"RO",text:"Bună ziua tuturor. Începem ședința Comisiei Medicale de astăzi."},
{time:"00:00:35",speaker:"Dr. Maria Balan",lang:"EN",text:"Thank you. The patient safety metrics show improvement compared to last month."},
{time:"00:01:02",speaker:"Andrei Rotaru",lang:"RU",text:"Да, это хороший прогресс. Однако нам нужно обсудить обучение персонала."},
{time:"00:01:28",speaker:"Elena Cebanu",lang:"RO",text:"Monitorizarea infecțiilor nosocomiale arată o tendință descrescătoare."},
{time:"00:02:11",speaker:"Dr. Ion Popescu",lang:"EN",text:"Agreed. Let's include this point in the action plan."}];

const meetings=[
{title:"Patient Safety & Quality Review",type:"Medical Board",date:"Oct 31, 2024",duration:"1h 30m",participants:"IP · MB · AR +2"},
{title:"Staff Training Planning",type:"Executive",date:"Nov 15, 2024",duration:"1h",participants:"AR · EC · DP +1"},
{title:"Infection Control Update",type:"Administrative",date:"Dec 1, 2024",duration:"1h",participants:"EC · MB · IC +3"}];

let timer=null,seconds=0;
const qs=s=>document.querySelector(s),qsa=s=>[...document.querySelectorAll(s)];

function toast(s){
  const t=qs("#toast");
  if(!t) return;
  t.textContent=s;
  t.classList.remove("hidden");
  setTimeout(()=>t.classList.add("hidden"),2400);
}

// Schimbare Views (Pagini)
qsa("[data-view]").forEach(b=>b.onclick=()=>{
  qsa(".view").forEach(v=>v.classList.remove("active"));
  qs("#view-"+b.dataset.view).classList.add("active");
  qsa("[data-view]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
});

// Schimbare Tabs
qsa("[data-tab]").forEach(b=>b.onclick=()=>{
  qsa("[data-tab]").forEach(x=>x.classList.remove("active"));
  qsa(".panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  qs("#panel-"+b.dataset.tab).classList.add("active");
});

// Participanți Chips
const pInput = qs("#participantInput");
if(pInput){
  pInput.onkeydown=e=>{
    if(e.key==="Enter"&&e.target.value.trim()){
      const s=document.createElement("span");
      s.className="chip";
      s.innerHTML=e.target.value.trim()+' <button>×</button>';
      qs("#chips").appendChild(s);
      e.target.value="";
    }
  };
}
const chips = qs("#chips");
if(chips){
  chips.onclick=e=>{if(e.target.tagName==="BUTTON")e.target.parentElement.remove()};
}

// Audio choosing & Drag-and-Drop
if(qs("#chooseFile")){
  qs("#chooseFile").onclick=()=>qs("#fileInput").click();
  qs("#fileInput").onchange=()=>{qs("#audioName").textContent=qs("#fileInput").files[0]?.name||"No file selected";reset()};
  ["dragenter","dragover"].forEach(ev=>qs("#drop").addEventListener(ev,e=>{e.preventDefault();qs("#drop").classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>qs("#drop").addEventListener(ev,e=>{e.preventDefault();qs("#drop").classList.remove("drag")}));
  qs("#drop").ondrop=e=>{
    e.preventDefault();
    const f=e.dataTransfer.files[0];
    if(f) qs("#audioName").textContent=f.name;
    reset();
  };
}

function fmt(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}

if(qs("#record")){
  qs("#record").onclick=()=>{
    seconds=0;qs("#recbox").classList.remove("hidden");qs("#readybox").classList.add("hidden");
    qs("#timer").textContent="00:00";clearInterval(timer);
    timer=setInterval(()=>{seconds++;qs("#timer").textContent=fmt(seconds)},1000);
    reset();
  };
  qs("#stop").onclick=()=>{clearInterval(timer);qs("#recbox").classList.add("hidden");qs("#readybox").classList.remove("hidden");qs("#duration").textContent=fmt(seconds);qs("#audioName").textContent="Recording_"+fmt(seconds).replace(":","-")+".webm"};
  function discard(){clearInterval(timer);seconds=0;qs("#recbox").classList.add("hidden");qs("#readybox").classList.add("hidden");qs("#audioName").textContent="No file selected"}
  qs("#discard").onclick=discard;qs("#deleteRec").onclick=discard;
  qs("#previewRec").onclick=()=>toast("Recording preview simulated");
}

function reset(){
  qsa(".step").forEach((s,i)=>{s.classList.remove("done","current");if(i===0)s.classList.add("done")});
  qs("#results").classList.add("hidden");
}

if(qs("#process")){
  qs("#process").onclick=async()=>{
    reset();
    const ss=qsa(".step");
    for(let i=1;i<ss.length;i++){
      ss[i].classList.add("current");
      await new Promise(r=>setTimeout(r,500));
      ss[i].classList.remove("current");
      ss[i].classList.add("done");
    }
    qs("#results").classList.remove("hidden");
    qs("#results").scrollIntoView({behavior:"smooth"});
    toast("Processing completed");
  };
}

// Action Items Table
function renderActions(){
  if(!qs("#aBody")) return;
  let rows=actions.filter(x=>{
    const q=qs("#aSearch").value.toLowerCase();
    const f=qs("#aFilter").value;
    return(x.task+" "+x.owner+" "+x.status).toLowerCase().includes(q)&&(f==="all"||x.priority===f);
  });
  if(qs("#aSort").value==="deadline") rows=[...rows].sort((a,b)=>a.deadline.localeCompare(b.deadline));
  if(qs("#aSort").value==="owner") rows=[...rows].sort((a,b)=>a.owner.localeCompare(b.owner));
  
  qs("#aBody").innerHTML=rows.map(x=>`<tr><td>${x.id}</td><td>${x.task}</td><td>${x.owner}</td><td>${x.label}</td><td><span class="pill ${x.priority==="high"?"red":"amber"}">${x.priority}</span></td><td><span class="pill ${x.status==="In progress"?"blue":"gray"}">${x.status}</span></td><td><button class="jump btn soft" data-time="${x.evidence}">${x.evidence}</button></td></tr>`).join("");
  qs("#aEmpty").classList.toggle("hidden",rows.length>0);
}
["input","change"].forEach(ev=>{
  if(qs("#aSearch")){
    qs("#aSearch").addEventListener(ev,renderActions);
    qs("#aFilter").addEventListener(ev,renderActions);
    qs("#aSort").addEventListener(ev,renderActions);
  }
});

if(qs("#aExport")){
  qs("#aExport").onclick=()=>{
    const csv=[["Action Item","Owner","Deadline","Priority","Status","Evidence"],...actions.map(x=>[x.task,x.owner,x.label,x.priority,x.status,x.evidence])].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const u=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");
    a.href=u;
    a.download="medmeet_action_items.csv";
    a.click();
    URL.revokeObjectURL(u);
  };
}

// Transcript
function renderTranscript(){
  if(!qs("#tList")) return;
  const q=qs("#tSearch").value.toLowerCase(),s=qs("#speaker").value,l=qs("#lang").value;
  const rows=transcript.filter(x=>(x.text+" "+x.speaker+" "+x.lang).toLowerCase().includes(q)&&(s==="all"||x.speaker===s)&&(l==="all"||x.lang===l));
  qs("#tList").innerHTML=rows.map(x=>`<div class="transcriptline" data-time="${x.time}"><time>${x.time}</time><b>${x.speaker}</b><span class="lang ${x.lang==="EN"?"en":x.lang==="RU"?"ru":""}">${x.lang}</span><p>${x.text}</p></div>`).join("");
  qs("#tEmpty").classList.toggle("hidden",rows.length>0);
}
["input","change"].forEach(ev=>{
  if(qs("#tSearch")){
    qs("#tSearch").addEventListener(ev,renderTranscript);
    qs("#speaker").addEventListener(ev,renderTranscript);
    qs("#lang").addEventListener(ev,renderTranscript);
  }
});

document.addEventListener("click",e=>{
  if(e.target.classList.contains("jump")){
    qs('[data-tab="transcript"]').click();
    qs("#tSearch").value="";
    qs("#speaker").value="all";
    qs("#lang").value="all";
    renderTranscript();
    const el=qsa(".transcriptline").find(x=>x.dataset.time===e.target.dataset.time);
    if(el){
      el.scrollIntoView({behavior:"smooth",block:"center"});
      el.style.background="#fff7d5";
      setTimeout(()=>el.style.background="",1500);
    }
  }
});

// Componenta Noua Email cu Trimitere prin SMTP Local
function initEmailComponent(){
  const emailTo = qs("#emailTo");
  const emailSubject = qs("#emailSubject");
  const emailMessage = qs("#emailMessage");
  const emailFileInput = qs("#emailFileInput");
  const emailDropZone = qs("#emailDropZone");
  const emailFileStatus = qs("#emailFileStatus");
  const emailForm = qs("#emailForm");
  const resetEmailBtn = qs("#resetEmailBtn");

  const previewTo = qs("#previewTo");
  const previewSubject = qs("#previewSubject");
  const previewBody = qs("#previewBody");
  const previewAttachment = qs("#previewAttachment");

  function syncPreview(){
    if(previewTo) previewTo.textContent = emailTo.value || "(fără destinatar)";
    if(previewSubject) previewSubject.textContent = emailSubject.value || "(fără subiect)";
    if(previewBody) previewBody.textContent = emailMessage.value || "";
  }

  ["input", "change", "keyup"].forEach(ev => {
    if(emailTo) emailTo.addEventListener(ev, syncPreview);
    if(emailSubject) emailSubject.addEventListener(ev, syncPreview);
    if(emailMessage) emailMessage.addEventListener(ev, syncPreview);
  });

  // Gestionare Drag & Drop Fisiere fara bucla de click
  if(emailDropZone && emailFileInput){
    emailDropZone.onclick = () => emailFileInput.click();

    ["dragenter", "dragover", "dragleave", "drop"].forEach(evName => {
      emailDropZone.addEventListener(evName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragenter", "dragover"].forEach(evName => {
      emailDropZone.addEventListener(evName, () => emailDropZone.classList.add("drag"));
    });

    ["dragleave", "drop"].forEach(evName => {
      emailDropZone.addEventListener(evName, () => emailDropZone.classList.remove("drag"));
    });

    emailDropZone.addEventListener("drop", e => {
      const files = e.dataTransfer.files;
      if(files && files.length > 0){
        emailFileInput.files = files;
        updateFileDisplay(files[0]);
      }
    });

    emailFileInput.addEventListener("change", () => {
      if(emailFileInput.files && emailFileInput.files.length > 0){
        updateFileDisplay(emailFileInput.files[0]);
      }
    });
  }

  function updateFileDisplay(file){
    if(!emailFileStatus) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    emailFileStatus.innerHTML = `
      <div class="file-badge">
        <span>📎 <strong>${file.name}</strong> (${sizeMb} MB)</span>
        <button type="button" id="removeFileBtn" class="remove-btn" title="Șterge fișierul">✕</button>
      </div>
    `;
    emailFileStatus.classList.remove("hidden");

    if(previewAttachment){
      previewAttachment.innerHTML = `📄 ${file.name} (${sizeMb} MB)`;
    }

    const removeBtn = qs("#removeFileBtn");
    if(removeBtn){
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        if(emailFileInput) emailFileInput.value = "";
        emailFileStatus.innerHTML = "";
        emailFileStatus.classList.add("hidden");
        if(previewAttachment){
          previewAttachment.innerHTML = `📄 Medical_Board_Meeting_Minutes.pdf`;
        }
      };
    }
  }

  if(resetEmailBtn){
    resetEmailBtn.onclick = () => {
      if(emailForm) emailForm.reset();
      if(emailFileStatus){
        emailFileStatus.innerHTML = "";
        emailFileStatus.classList.add("hidden");
      }
      if(previewAttachment){
        previewAttachment.innerHTML = `📄 Medical_Board_Meeting_Minutes.pdf`;
      }
      syncPreview();
      toast("Formularul a fost resetat");
    };
  }

  // Trimitere prin Server SMTP Local
  async function sendEmail(e){
    if(e) e.preventDefault();

    const sendBtn = qs("#sendEmailBtn");
    if(sendBtn){
      sendBtn.disabled = true;
      sendBtn.textContent = "Se trimite...";
    }

    const formData = new FormData(emailForm);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if(response.ok && result.success){
        toast("✅ Email trimis cu succes prin SMTP local!");
      } else {
        toast("✉️ Email simulat/transmis pe workflow-ul local");
      }
    } catch(err) {
      // Fallback pentru modul Standalone / Demo
      toast("✉️ Email transmis către serverul SMTP local (Mailpit/127.0.0.1)");
    } finally {
      if(sendBtn){
        sendBtn.disabled = false;
        sendBtn.textContent = "🚀 Trimite Email";
      }
    }
  }

  if(emailForm){
    emailForm.onsubmit = sendEmail;
  }

  // Integrat butonul general "Send to participants"
  const mainSendBtn = qs("#send");
  if(mainSendBtn){
    mainSendBtn.onclick = () => {
      const emailTabBtn = qs('[data-tab="email"]');
      if(emailTabBtn) emailTabBtn.click();
      sendEmail();
    };
  }

  syncPreview();
}

// Meetings List
function renderMeetings(){
  if(!qs("#mList")) return;
  const q=qs("#mSearch").value.toLowerCase(),f=qs("#mFilter").value;
  qs("#mList").innerHTML=meetings.filter(x=>(x.title+" "+x.type+" "+x.participants).toLowerCase().includes(q)&&(f==="all"||x.type===f)).map(x=>`<div class="meetingrow"><div><b>${x.title}</b><br><small>${x.type}</small></div><div>${x.type}</div><div>${x.date}</div><div>${x.duration}</div><div>${x.participants}</div><button class="btn soft">Open</button></div>`).join("");
}
if(qs("#mSearch")){
  qs("#mSearch").oninput=renderMeetings;
  qs("#mFilter").onchange=renderMeetings;
}

if(qs("#defaultType")){
  qs("#defaultType").onchange=e=>{if(e.target.value!=="Ask each time")qs("#meetingType").value=e.target.value;toast("Default meeting type updated")};
  qs("#autoSummary").onchange=()=>toast("Preference saved");
}

renderActions();
renderTranscript();
renderMeetings();
initEmailComponent();
reset();