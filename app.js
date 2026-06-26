
const state={all:[],deck:[],index:0,revealed:false,quiz:false,voices:[],selectedVoice:null,speaking:false,readAloud:false,lastSpokenKey:'',voicesReady:false,pendingSpeech:''};
const $=s=>document.querySelector(s);
const uniq=arr=>[...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
function optionize(sel,values){const el=$(sel); values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);});}
function textMatch(sp,q){return !q || sp.searchText.includes(q.toLowerCase())}
function valMatch(list,v){return !v || (list||[]).includes(v)}
function short(text,n=180){if(!text)return'';return text.length>n?text.slice(0,n-1).trim()+'…':text}
function applyFilters(){const q=$('#search').value.trim();const fam=$('#familyFilter').value;const reg=$('#regionFilter').value;const form=$('#formFilter').value;state.deck=state.all.filter(sp=>textMatch(sp,q)&&(!fam||sp.family===fam)&&valMatch(sp.regions,reg)&&valMatch(sp.forms,form));state.index=0;state.revealed=false;render();}
function render(){renderCard();$('#deckMeta').textContent=`${state.deck.length} card${state.deck.length===1?'':'s'} in this deck`;$('#stat-count').textContent=state.all.length;setTimeout(maybeAutoSpeak,60);}
function chips(sp){return [sp.family,...(sp.forms||[]).slice(0,1),...(sp.regions||[]).slice(0,2)].filter(Boolean).map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join('')}
function bestCards(sp){const keys=['Field ID','Bark','Leaves / Branchlets','Flowers / Cones / Fruit','Habitat','Distribution','Status','Summary'];let cards=[];for(const k of keys){const c=(sp.cards||[]).find(x=>x.label===k&&x.text);if(c)cards.push(c);if(cards.length>=6)break;}return cards;}
function renderCard(){const el=$('#flashcard'); if(!state.deck.length){el.innerHTML='<div class="empty">No cards match those filters. Hit reset and build again.</div>';return;}const sp=state.deck[state.index%state.deck.length];const cards=bestCards(sp);const name=state.revealed||!state.quiz?escapeHtml(sp.commonName):'Mystery specimen';const sci=state.revealed||!state.quiz?escapeHtml(sp.scientificName):'Reveal when ready';el.innerHTML=`<div><div class="photo-wrap"><img src="${sp.image}" alt="${escapeHtml(sp.imageAlt||sp.commonName)}" loading="eager" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=&quot;empty&quot;>Image file missing from this deploy.</div>'"></div><div class="gallery-strip"><div class="gallery-tile"><img src="${sp.image}" alt="${escapeHtml(sp.imageAlt||sp.commonName)}"><span>Current image</span></div><div class="gallery-tile">Whole form</div><div class="gallery-tile">Bark / trunk</div><div class="gallery-tile">Leaf / fruit</div></div></div><div class="card-body"><div class="card-kicker">${state.quiz?'Quick ID':'Study card'} · ${state.index+1}/${state.deck.length}</div><h3>${name}</h3><div class="sci">${sci}</div><div class="chips">${chips(sp)}</div><div class="info-cards">${cards.map(c=>`<div class="info"><b>${escapeHtml(c.label)}</b><p>${escapeHtml(short(c.text,210))}</p></div>`).join('')}</div><details class="details"><summary>Source, licence and authority</summary><p><b>Accepted status:</b> ${escapeHtml(sp.acceptedNameStatus||'Recorded')}</p><p><b>Image:</b> ${escapeHtml(sp.imageCredit.creator||'Creator recorded')} · ${escapeHtml(sp.imageCredit.licence||'Licence recorded')} ${sp.imageCredit.sourcePageUrl?`· <a target="_blank" rel="noreferrer" href="${sp.imageCredit.sourcePageUrl}">source</a>`:''}</p><p><b>Authority:</b> ${escapeHtml(sp.authoritySource?.citation||'Source recorded in project data')}</p></details></div>`;}
function renderGrid(){}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function getVoiceText(sp, mode='card'){
  if(mode==='test') return 'ArbotFlash voice test. Australian speech module ready.';
  if(!sp) return '';
  // Match the Tree ID Trainer behaviour: speak the current card side only, not the whole profile.
  // For ArbotFlash at this stage, that means names only.
  if(state.quiz && !state.revealed) return 'Mystery specimen.';
  return [sp.commonName, sp.scientificName].filter(Boolean).join('. ') + '.';
}
function speechSupported(){return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance!=='undefined';}
function voiceRank(v){
  const name=`${v.name} ${v.lang}`.toLowerCase();
  let score=0;
  if(/en-au|australia|australian/.test(name)) score+=60;
  if(/female|samantha|karen|tessa|moira|serena|zira|aria|jenny|natasha|olivia/.test(name)) score+=20;
  if(/^en/.test((v.lang||'').toLowerCase())) score+=10;
  if(/google|microsoft|apple|natural|premium|enhanced/.test(name)) score+=8;
  return score;
}
function voiceLabel(v){return v ? `${v.name} · ${v.lang||'unknown'}` : 'No usable voice';}
function loadVoiceCache(){
  try{return JSON.parse(localStorage.getItem('arbotflashVoiceCache')||'null')||null}catch(e){return null}
}
function describeVoiceState(){
  if(!speechSupported()) return 'Speech is unavailable in this browser.';
  if(!state.voicesReady) return 'Waiting for this device to provide its installed voices…';
  if(!state.selectedVoice) return 'No usable voice is installed. Try Reload voices.';
  return `Using: ${voiceLabel(state.selectedVoice)}`;
}
function cacheVoiceList(){
  try{
    const payload={saved:new Date().toISOString(),voices:state.voices.map(v=>({name:v.name,lang:v.lang,voiceURI:v.voiceURI}))};
    localStorage.setItem('arbotflashVoiceCache',JSON.stringify(payload));
    setVoiceStatus(`Voice list cached · ${payload.voices.length} installed voices`);
  }catch(e){setVoiceStatus('Could not cache voices on this device.');}
}
function clearVoiceCache(){
  try{localStorage.removeItem('arbotflashVoiceCache');localStorage.removeItem('arbotflashVoiceName');localStorage.removeItem('arbotflashReadAloud');}catch(e){}
  setVoiceStatus('Voice cache cleared. Reload voices when ready.');
}
function populateVoices(){
  const sel=$('#voiceSelect');
  if(!sel) return;
  if(!speechSupported()){
    sel.innerHTML='<option>Speech not available on this browser</option>';
    state.voices=[];state.selectedVoice=null;state.voicesReady=false;
    setVoiceStatus('Speech is unavailable in this browser.');
    return;
  }
  const voices=window.speechSynthesis.getVoices();
  state.voices=voices.slice().sort((a,b)=>voiceRank(b)-voiceRank(a)||a.name.localeCompare(b.name));
  state.voicesReady=state.voices.length>0;
  const savedName=localStorage.getItem('arbotflashVoiceName');
  const preferred=state.voices.find(v=>v.voiceURI===savedName||v.name===savedName)||state.voices[0]||null;
  state.selectedVoice=preferred;
  sel.innerHTML='';
  if(!state.voices.length){
    const cached=loadVoiceCache();
    const o=document.createElement('option');
    o.textContent=cached?'Cached list saved · tap Reload voices':'Loading installed voices…';
    sel.appendChild(o);
  }else{
    state.voices.forEach(v=>{
      const o=document.createElement('option');
      o.value=v.voiceURI||v.name;
      o.textContent=voiceLabel(v);
      if(preferred&&(v.voiceURI===preferred.voiceURI||v.name===preferred.name)) o.selected=true;
      sel.appendChild(o);
    });
  }
  updateVoiceSourceLabel();
  setVoiceStatus(describeVoiceState());
  if(state.pendingSpeech && state.readAloud){
    const pending=state.pendingSpeech; state.pendingSpeech=''; speakText(pending,'auto');
  }
}
function updateVoiceSourceLabel(){
  const label=$('#voiceSourceLabel');
  if(!label) return;
  label.textContent='AI Australian — Female';
}
function setReadAloud(on){
  state.readAloud=!!on;
  try{localStorage.setItem('arbotflashReadAloud',state.readAloud?'1':'0')}catch(e){}
  $('#readOnBtn')?.classList.toggle('active',state.readAloud);
  $('#readOffBtn')?.classList.toggle('active',!state.readAloud);
  if(!state.readAloud) stopSpeech(false);
  setVoiceStatus(state.readAloud?'Read aloud on. The app will read names only.':'Read aloud off. Voice will only speak when tested.');
}
function setVoiceStatus(text){const el=$('#voiceStatus'); if(el) el.textContent=text;}
function stopSpeech(update=true){
  if(speechSupported()) window.speechSynthesis.cancel();
  state.speaking=false;
  if(update) setVoiceStatus(state.readAloud?'Voice stopped. Read aloud remains on.':'Voice stopped. Read aloud is off.');
}
function speakText(text, reason='manual'){
  if(!speechSupported()){setVoiceStatus('Voice unavailable on this browser.');return;}
  if(!text) return;
  if(!state.voicesReady){state.pendingSpeech=String(text);populateVoices();return;}
  const voice=state.selectedVoice;
  if(!voice){populateVoices();setVoiceStatus('No usable voice is installed.');return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(String(text));
  u.voice=voice;
  u.lang=voice.lang || 'en-AU';
  u.rate=.92;
  u.pitch=1;
  u.onstart=()=>{state.speaking=true;setVoiceStatus(reason==='test'?'Testing voice…':'Speaking names…');};
  u.onend=()=>{state.speaking=false;setVoiceStatus(describeVoiceState());};
  u.onerror=()=>{state.speaking=false;setVoiceStatus('That voice failed. Pick another voice and press Test voice.');};
  window.speechSynthesis.speak(u);
}
function speakCurrent(reason='manual'){
  const sp=state.deck[state.index%state.deck.length];
  if(!sp) return;
  speakText(getVoiceText(sp),reason);
}
function maybeAutoSpeak(){
  if(!state.readAloud) return;
  const sp=state.deck[state.index%state.deck.length];
  if(!sp) return;
  const key=`${sp.id||sp.scientificName}:${state.revealed}:${state.quiz}`;
  if(state.lastSpokenKey===key) return;
  state.lastSpokenKey=key;
  speakCurrent('auto');
}
function setSkin(name){
  document.body.classList.remove('skin-forest','skin-night','skin-paper');
  document.body.classList.add(`skin-${name}`);
  document.querySelectorAll('[data-skin]').forEach(b=>b.classList.toggle('active',b.dataset.skin===name));
}

async function init(){const res=await fetch('data/species.json');const data=await res.json();state.all=data.species;state.deck=[...state.all];optionize('#familyFilter',uniq(state.all.map(x=>x.family)));optionize('#regionFilter',uniq(state.all.flatMap(x=>x.regions||[])));optionize('#formFilter',uniq(state.all.flatMap(x=>x.forms||[])));['#search','#familyFilter','#regionFilter','#formFilter'].forEach(s=>$(s).addEventListener('input',applyFilters));$('#resetBtn').addEventListener('click',()=>{$('#search').value='';$('#familyFilter').value='';$('#regionFilter').value='';$('#formFilter').value='';applyFilters();});$('#nextBtn').addEventListener('click',()=>{if(state.deck.length){state.index=(state.index+1)%state.deck.length;state.revealed=false;renderCard();setTimeout(maybeAutoSpeak,60);}});$('#prevBtn').addEventListener('click',()=>{if(state.deck.length){state.index=(state.index-1+state.deck.length)%state.deck.length;state.revealed=false;renderCard();setTimeout(maybeAutoSpeak,60);}});$('#revealBtn').addEventListener('click',()=>{state.revealed=!state.revealed;renderCard();setTimeout(maybeAutoSpeak,60);});$('#voiceTestBtn').addEventListener('click',()=>speakText(getVoiceText(state.deck[state.index%state.deck.length]||{},'test'),'test'));$('#voiceStopBtn').addEventListener('click',()=>stopSpeech(true));$('#voiceReloadBtn').addEventListener('click',()=>{populateVoices();setVoiceStatus('Voices reloaded.');});$('#voiceCacheBtn').addEventListener('click',cacheVoiceList);$('#voiceClearBtn').addEventListener('click',clearVoiceCache);$('#readOnBtn').addEventListener('click',()=>setReadAloud(true));$('#readOffBtn').addEventListener('click',()=>setReadAloud(false));$('#voiceSelect').addEventListener('change',e=>{state.selectedVoice=state.voices.find(v=>(v.voiceURI||v.name)===e.target.value)||null;try{localStorage.setItem('arbotflashVoiceName',e.target.value)}catch(x){}updateVoiceSourceLabel();setVoiceStatus(describeVoiceState());});populateVoices();state.readAloud=localStorage.getItem('arbotflashReadAloud')==='1';setReadAloud(state.readAloud);if('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged=populateVoices;document.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>setSkin(b.dataset.skin)));$('#studyBtn').addEventListener('click',()=>{state.quiz=false;state.revealed=true;$('#studyBtn').classList.add('active');$('#quizBtn').classList.remove('active');renderCard();});$('#quizBtn').addEventListener('click',()=>{state.quiz=true;state.revealed=false;$('#quizBtn').classList.add('active');$('#studyBtn').classList.remove('active');renderCard();setTimeout(maybeAutoSpeak,60);});state.revealed=true;render();}
init().catch(err=>{document.body.insertAdjacentHTML('afterbegin',`<div class="empty">Could not load ArbotFlash data: ${escapeHtml(err.message)}</div>`)});
