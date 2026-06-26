
const state={all:[],deck:[],index:0,revealed:false,quiz:false,lastSpokenKey:''};
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


const SPEECH_KEY='arbotflash-speech-v2';
let speechSettings=Object.assign(
  {enabled:false,voiceURI:'',gender:'any',rate:0.92},
  loadJSON(SPEECH_KEY,loadJSON('arbotflash-speech-v1',{}))
);
let speechVoices=[];
let voicesReady=false;
let pendingSpeech='';

function loadJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
function saveSpeechSettings(){try{localStorage.setItem(SPEECH_KEY,JSON.stringify(speechSettings))}catch(e){}}
function cardSideText(sp){
  if(!sp)return'';
  // ArbotFlash rule for now: speech reads only the card identity, never the whole profile/features/cards.
  if(state.quiz&&!state.revealed)return 'Mystery specimen.';
  return [sp.commonName,sp.scientificName].filter(Boolean).join('. ')+'.';
}
function speechSupported(){return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;}
function inferredVoiceGender(v){
  const n=String(v?.name||'').toLowerCase();
  if(/\b(female|woman|girl)\b/.test(n))return'female';
  if(/\b(male|man|boy)\b/.test(n))return'male';
  const female=['samantha','victoria','karen','moira','tessa','fiona','ava','allison','susan','zira','hazel','heera','sangeeta','veena','catherine','alice','amelie','anna','helena','maria','sarah','sara','emma','olivia','sophia','jenny','aria','natasha','sonia','kathy','linda','nicole','joanna','jill','kate'];
  const male=['daniel','alex','fred','tom','thomas','david','mark','george','james','john','michael','mike','ryan','brian','lee','oliver','william','robert','paul','stefan','hans','klaus','martin','erik','henrik','arthur','aaron'];
  if(female.some(x=>n.includes(x)))return'female';
  if(male.some(x=>n.includes(x)))return'male';
  return'unknown';
}
function voiceLabel(v){
  const local=v.localService?'device':'network';
  const gender=inferredVoiceGender(v);
  const tag=gender==='female'?'female':gender==='male'?'male':'unlabelled';
  return `${v.name} — ${v.lang||'unknown'} (${tag}, ${local})`;
}
function filteredSpeechVoices(){
  const wanted=speechSettings.gender||'any';
  if(wanted==='any')return speechVoices;
  return speechVoices.filter(v=>inferredVoiceGender(v)===wanted);
}
function sortVoices(list){
  return [...list].sort((a,b)=>{
    const aAu=String(a.lang||'').toLowerCase()==='en-au'?0:1;
    const bAu=String(b.lang||'').toLowerCase()==='en-au'?0:1;
    const aEnglish=String(a.lang||'').toLowerCase().startsWith('en')?0:1;
    const bEnglish=String(b.lang||'').toLowerCase().startsWith('en')?0:1;
    const aLocal=a.localService?0:1;
    const bLocal=b.localService?0:1;
    return aAu-bAu||aEnglish-bEnglish||aLocal-bLocal||String(a.lang).localeCompare(String(b.lang))||a.name.localeCompare(b.name);
  });
}
function englishVoices(){return speechVoices.filter(v=>String(v.lang||'').toLowerCase().startsWith('en'));}
function bestInstalledVoice(){
  return (
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-au'&&v.localService)||
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-au')||
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-gb'&&v.localService)||
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-gb')||
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-us'&&v.localService)||
    speechVoices.find(v=>String(v.lang||'').toLowerCase()==='en-us')||
    englishVoices().find(v=>v.localService)||englishVoices()[0]||speechVoices.find(v=>v.localService)||speechVoices[0]||null
  );
}
function selectedVoice(){
  if(speechSettings.voiceURI){const chosen=speechVoices.find(v=>v.voiceURI===speechSettings.voiceURI);if(chosen)return chosen;}
  const fallback=bestInstalledVoice();
  if(fallback)speechSettings.voiceURI=fallback.voiceURI;
  return fallback;
}
function describeVoiceState(){
  if(!speechSupported())return'Speech is unavailable in this browser.';
  if(!voicesReady)return'Waiting for this device to provide its installed voices…';
  const chosen=selectedVoice();
  if(!chosen)return'No usable voice is installed. Try Any voice or Unknown / unlabelled.';
  return `Using: ${voiceLabel(chosen)}`;
}
function renderSpeechControls(){
  const toggle=$('#speechToggle');const genderSelect=$('#speechGender');const voiceSelect=$('#speechVoice');const test=$('#speechTest');const status=$('#speechStatus');
  if(!toggle||!genderSelect||!voiceSelect||!test||!status)return;
  genderSelect.value=speechSettings.gender||'any';
  if(!speechSupported()){
    speechSettings.enabled=false;toggle.disabled=true;test.disabled=true;voiceSelect.disabled=true;toggle.textContent='Speech unavailable';status.textContent='Try opening the site in Chrome or Samsung Internet.';return;
  }
  toggle.disabled=false;test.disabled=!voicesReady||!selectedVoice();
  toggle.textContent=speechSettings.enabled?'🔊 Speech on':'🔇 Speech off';
  toggle.className=speechSettings.enabled?'primary speech-toggle':'secondary speech-toggle';
  if(!voicesReady){voiceSelect.innerHTML='<option value="">Loading installed voices…</option>';voiceSelect.disabled=true;}
  else{
    const visible=filteredSpeechVoices();voiceSelect.disabled=!visible.length;
    voiceSelect.innerHTML=visible.length?visible.map(v=>`<option value="${escapeHtml(v.voiceURI)}">${escapeHtml(voiceLabel(v))}</option>`).join(''):'<option value="">No matching voices detected</option>';
    const chosen=selectedVoice();if(chosen)voiceSelect.value=chosen.voiceURI;
  }
  status.textContent=describeVoiceState();
}
function refreshSpeechVoices(){
  if(!speechSupported())return;
  const list=window.speechSynthesis.getVoices()||[];
  if(list.length){
    speechVoices=sortVoices(list);voicesReady=true;
    if(!speechSettings.voiceURI||!speechVoices.some(v=>v.voiceURI===speechSettings.voiceURI)){
      const best=bestInstalledVoice();speechSettings.voiceURI=best?best.voiceURI:'';saveSpeechSettings();
    }
    renderSpeechControls();
    if(pendingSpeech&&speechSettings.enabled){const text=pendingSpeech;pendingSpeech='';setTimeout(()=>speakCardText(text),100);}
  }else renderSpeechControls();
}
function scheduleVoiceLoading(){refreshSpeechVoices();[150,400,900,1800,3500].forEach(ms=>setTimeout(refreshSpeechVoices,ms));}
function speakCardText(text,force=false){
  if((!speechSettings.enabled&&!force)||!speechSupported()||!text)return;
  if(!voicesReady){pendingSpeech=String(text);scheduleVoiceLoading();return;}
  const voice=selectedVoice();
  if(!voice){renderSpeechControls();return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(String(text));
  utterance.voice=voice;utterance.lang=voice.lang||'en-AU';utterance.rate=Number(speechSettings.rate)||0.92;utterance.pitch=1;
  utterance.onerror=()=>{const status=$('#speechStatus');if(status)status.textContent='That voice failed to speak. Pick another installed voice and press Test voice.';};
  window.speechSynthesis.speak(utterance);
}
function speakCurrent(force=false){const sp=state.deck[state.index%state.deck.length];if(sp)speakCardText(cardSideText(sp),force);}
function maybeAutoSpeak(){
  if(!speechSettings.enabled)return;
  const sp=state.deck[state.index%state.deck.length];if(!sp)return;
  const key=`${sp.id||sp.scientificName}:${state.revealed}:${state.quiz}`;
  if(state.lastSpokenKey===key)return;state.lastSpokenKey=key;speakCurrent(false);
}
function stopSpeech(){if(speechSupported())window.speechSynthesis.cancel();const status=$('#speechStatus');if(status)status.textContent='Voice stopped.';}
function setSkin(name){
  document.body.classList.remove('skin-forest','skin-night','skin-paper');
  document.body.classList.add(`skin-${name}`);
  document.querySelectorAll('[data-skin]').forEach(b=>b.classList.toggle('active',b.dataset.skin===name));
}

async function init(){
  const res=await fetch('data/species.json');
  const data=await res.json();
  state.all=data.species;
  state.deck=[...state.all];
  optionize('#familyFilter',uniq(state.all.map(x=>x.family)));
  optionize('#regionFilter',uniq(state.all.flatMap(x=>x.regions||[])));
  optionize('#formFilter',uniq(state.all.flatMap(x=>x.forms||[])));
  ['#search','#familyFilter','#regionFilter','#formFilter'].forEach(s=>$(s).addEventListener('input',applyFilters));
  $('#resetBtn').addEventListener('click',()=>{$('#search').value='';$('#familyFilter').value='';$('#regionFilter').value='';$('#formFilter').value='';applyFilters();});
  $('#nextBtn').addEventListener('click',()=>{if(state.deck.length){state.index=(state.index+1)%state.deck.length;state.revealed=false;renderCard();setTimeout(maybeAutoSpeak,60);}});
  $('#prevBtn').addEventListener('click',()=>{if(state.deck.length){state.index=(state.index-1+state.deck.length)%state.deck.length;state.revealed=false;renderCard();setTimeout(maybeAutoSpeak,60);}});
  $('#revealBtn').addEventListener('click',()=>{state.revealed=!state.revealed;renderCard();setTimeout(maybeAutoSpeak,60);});
  $('#speechToggle').addEventListener('click',()=>{speechSettings.enabled=!speechSettings.enabled;saveSpeechSettings();renderSpeechControls();if(!speechSettings.enabled)stopSpeech();else speakCurrent(false);});
  $('#speechTest').addEventListener('click',()=>speakCardText('ArbotFlash voice test. Current card names only.',true));
  $('#speechStop').addEventListener('click',stopSpeech);
  $('#speechRefresh').addEventListener('click',scheduleVoiceLoading);
  $('#speechGender').addEventListener('change',e=>{speechSettings.gender=e.target.value;speechSettings.voiceURI='';saveSpeechSettings();renderSpeechControls();});
  $('#speechVoice').addEventListener('change',e=>{speechSettings.voiceURI=e.target.value;saveSpeechSettings();renderSpeechControls();});
  if(speechSupported())window.speechSynthesis.addEventListener?.('voiceschanged',refreshSpeechVoices);
  scheduleVoiceLoading();
  document.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>setSkin(b.dataset.skin)));
  $('#studyBtn').addEventListener('click',()=>{state.quiz=false;state.revealed=true;$('#studyBtn').classList.add('active');$('#quizBtn').classList.remove('active');renderCard();setTimeout(maybeAutoSpeak,60);});
  $('#quizBtn').addEventListener('click',()=>{state.quiz=true;state.revealed=false;$('#quizBtn').classList.add('active');$('#studyBtn').classList.remove('active');renderCard();setTimeout(maybeAutoSpeak,60);});
  state.revealed=true;
  render();
}
init().catch(err=>{document.body.insertAdjacentHTML('afterbegin',`<div class="empty">Could not load ArbotFlash data: ${escapeHtml(err.message)}</div>`)});