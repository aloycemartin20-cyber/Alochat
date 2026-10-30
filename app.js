const $ = (s) => document.querySelector(s);
const STORAGE = { chats: "alochat_chats_v1", active: "alochat_active_v1", api: "alochat_api_url", model: "alochat_model", lang: "alochat_lang", responseLang: "alochat_response_lang", theme: "alochat_theme" };
let chats = JSON.parse(localStorage.getItem(STORAGE.chats) || "[]");
let activeId = localStorage.getItem(STORAGE.active);
let busy = false;
let aborter = null;
const translations = {
 sw:{newChat:"Mazungumzo mapya",recent:"MAZUNGUMZO YA KARIBUNI",settings:"Mipangilio",theme:"Badili mwonekano",hello:"Habari! Mimi ni Alochat.",intro:"Uliza swali lolote. Niko hapa kukusaidia kufikiri, kujifunza na kuunda.",thinking:"Alochat anafikiri...",placeholder:"Andika ujumbe wako hapa...",hint:"ALOCHAT anaweza kukosea. Hakiki taarifa muhimu."},
 en:{newChat:"New chat",recent:"RECENT CHATS",settings:"Settings",theme:"Toggle appearance",hello:"Hello! I'm Alochat.",intro:"Ask anything. I'm here to help you think, learn and create.",thinking:"Alochat is thinking...",placeholder:"Type your message here...",hint:"ALOCHAT can make mistakes. Verify important information."},
 fr:{newChat:"Nouvelle discussion",recent:"DISCUSSIONS RÉCENTES",settings:"Paramètres",theme:"Changer le thème",hello:"Bonjour ! Je suis Alochat.",intro:"Posez vos questions. Je suis là pour vous aider à réfléchir, apprendre et créer.",thinking:"Alochat réfléchit...",placeholder:"Écrivez votre message ici...",hint:"ALOCHAT peut se tromper. Vérifiez les informations importantes."},
 es:{newChat:"Nuevo chat",recent:"CHATS RECIENTES",settings:"Ajustes",theme:"Cambiar apariencia",hello:"¡Hola! Soy Alochat.",intro:"Pregunta lo que quieras. Estoy aquí para ayudarte a pensar, aprender y crear.",thinking:"Alochat está pensando...",placeholder:"Escribe tu mensaje aquí...",hint:"ALOCHAT puede cometer errores. Verifica la información importante."}
};
function persist(){localStorage.setItem(STORAGE.chats,JSON.stringify(chats));localStorage.setItem(STORAGE.active,activeId||"");}
function toast(s){const t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400);}
function newChat(){const c={id:crypto.randomUUID(),title:"Mazungumzo mapya",messages:[],updated:Date.now()};chats.unshift(c);activeId=c.id;persist();render();}
function current(){return chats.find(c=>c.id===activeId);}
function renderHistory(){
 const el=$("#historyList");el.innerHTML="";
 chats.sort((a,b)=>b.updated-a.updated).forEach(c=>{
  const row=document.createElement("div");row.className="history-item"+(c.id===activeId?" active":"");
  const name=document.createElement("span");name.className="history-name";name.textContent=c.title||"Mazungumzo mapya";name.onclick=()=>{activeId=c.id;persist();render();};
  const del=document.createElement("button");del.className="delete-chat";del.textContent="×";del.title="Delete chat";del.onclick=e=>{e.stopPropagation();if(confirm("Futa mazungumzo haya?")){chats=chats.filter(x=>x.id!==c.id);if(activeId===c.id)activeId=chats[0]?.id||null;persist();render();}};
  row.append(name,del);el.append(row);
 });
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatText(s){
 let safe=escapeHtml(s);
 safe=safe.replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`);
 safe=safe.replace(/`([^`]+)`/g,"<code>$1</code>");
 safe=safe.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
 safe=safe.replace(/\n/g,"<br>");
 return safe;
}
function renderMessages(){
 const box=$("#messages"), c=current();box.innerHTML="";
 $("#welcome").classList.toggle("hidden",!!(c&&c.messages.length));
 if(!c)return;
 c.messages.forEach((m,i)=>{
  const wrap=document.createElement("div");wrap.className="message "+(m.role==="user"?"user":"assistant");
  const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=m.role==="user"?"U":"A";
  const body=document.createElement("div");body.className="bubble";body.innerHTML=formatText(m.content||"");
  if(m.role==="assistant"){
   const actions=document.createElement("div");actions.className="message-actions";
   const copy=document.createElement("button");copy.textContent="Copy";copy.onclick=()=>navigator.clipboard?.writeText(m.content).then(()=>toast("Copied"));
   actions.append(copy);body.append(actions);
  }
  wrap.append(avatar,body);box.append(wrap);
 });
 $("#chatArea").scrollTop=$("#chatArea").scrollHeight;
}
function render(){renderHistory();renderMessages();}
function apiBase(){return (localStorage.getItem(STORAGE.api)||"").trim().replace(/\/+$/,"");}
async function sendMessage(text){
 if(busy||!text.trim())return;
 const base=apiBase();if(!base){$("#settingsDialog").showModal();$("#settingsStatus").textContent="Weka Backend URL kwanza.";toast("Weka Backend URL kwenye Settings.");return;}
 if(!current())newChat();
 const c=current();c.messages.push({role:"user",content:text.trim()});c.title=c.messages.length===1?text.trim().slice(0,38):c.title;c.updated=Date.now();persist();render();
 $("#promptInput").value="";autoResize();busy=true;$("#sendBtn").disabled=true;$("#typing").classList.remove("hidden");
 const assistant={role:"assistant",content:""};c.messages.push(assistant);aborter=new AbortController();
 try{
  const response=await fetch(base+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:c.messages.filter(x=>x.content).map(({role,content})=>({role,content})),model:localStorage.getItem(STORAGE.model)||"openrouter/auto",language:localStorage.getItem(STORAGE.responseLang)||"auto"}),signal:aborter.signal});
  if(!response.ok){let msg=await response.text();throw new Error(msg||`HTTP ${response.status}`);}
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop();
   for(const line of lines){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(data==="[DONE]")continue;try{const obj=JSON.parse(data);const delta=obj.choices?.[0]?.delta?.content;if(delta){assistant.content+=delta;renderMessages();}}catch{}}
  }
  if(!assistant.content)assistant.content="Samahani, sijapata jibu. Jaribu tena.";
 }catch(e){if(e.name!=="AbortError"){assistant.content="Hitilafu: "+e.message+"\n\nHakikisha Backend URL na Cloudflare Worker vimewekwa sawa.";toast("Imeshindikana kuwasiliana na AI.");}}
 finally{busy=false;aborter=null;$("#typing").classList.add("hidden");$("#sendBtn").disabled=false;c.updated=Date.now();persist();render();}
}
function autoResize(){const t=$("#promptInput");t.style.height="auto";t.style.height=Math.min(t.scrollHeight,180)+"px";}
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();sendMessage($("#promptInput").value);});
$("#promptInput").addEventListener("input",autoResize);
$("#promptInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#chatForm").requestSubmit();}});
$("#newChatBtn").onclick=newChat;
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem(STORAGE.theme,document.body.classList.contains("light")?"light":"dark");};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
function openSettings(){ $("#apiUrlInput").value=apiBase();$("#modelSelect").value=localStorage.getItem(STORAGE.model)||"openrouter/auto";$("#responseLanguage").value=localStorage.getItem(STORAGE.responseLang)||"auto";$("#settingsDialog").showModal();}
$("#settingsBtn").onclick=openSettings;$("#topSettingsBtn").onclick=openSettings;
$("#saveSettingsBtn").onclick=()=>{localStorage.setItem(STORAGE.api,$("#apiUrlInput").value.trim());localStorage.setItem(STORAGE.model,$("#modelSelect").value);localStorage.setItem(STORAGE.responseLang,$("#responseLanguage").value);$("#settingsDialog").close();toast("Mipangilio imehifadhiwa.");};
$("#loadModelsBtn").onclick=async()=>{const base=$("#apiUrlInput").value.trim().replace(/\/+$/,"");const s=$("#settingsStatus");if(!base){s.textContent="Weka Backend URL kwanza.";return;}s.textContent="Inapakia models...";try{const r=await fetch(base+"/api/models");if(!r.ok)throw Error(await r.text());const d=await r.json();const select=$("#modelSelect");select.innerHTML="";(d.data||[]).slice(0,100).forEach(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=m.name||m.id;select.append(o);});s.textContent=`Models ${d.data?.length||0} zimepatikana.`;}catch(e){s.textContent="Imeshindikana: "+e.message;}};
$("#languageSelect").onchange=e=>{const lang=e.target.value;localStorage.setItem(STORAGE.lang,lang);document.documentElement.lang=lang;document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(translations[lang][key])el.textContent=translations[lang][key];});document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const key=el.dataset.i18nPlaceholder;if(translations[lang][key])el.placeholder=translations[lang][key];});};
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>sendMessage(b.dataset.prompt));
$("#voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast("Voice input haitumiki kwenye browser hii.");return;}const rec=new SR();rec.lang=({sw:"sw-TZ",en:"en-US",fr:"fr-FR",es:"es-ES"})[$("#languageSelect").value]||"sw-TZ";rec.onresult=e=>{$("#promptInput").value=e.results[0][0].transcript;autoResize();};rec.onerror=()=>toast("Voice input imeshindikana.");rec.start();};
const lang=localStorage.getItem(STORAGE.lang)||"sw";$("#languageSelect").value=lang;$("#languageSelect").dispatchEvent(new Event("change"));
if(localStorage.getItem(STORAGE.theme)==="light")document.body.classList.add("light");
if(!activeId||!chats.some(c=>c.id===activeId)){if(chats.length)activeId=chats[0].id;else newChat();}
render();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
