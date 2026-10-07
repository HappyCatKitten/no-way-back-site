'use strict';
const $=id=>document.getElementById(id),base=window.STORYBOARD;
const storageKey='no-way-back-storyboard-ai-edit-v1',legacyKey='no-way-back-timed-v2';
const clone=x=>structuredClone(x),editable=['description','movement','angle','notes','image'];
const knownIds=new Set([...base.shots,...(base.archivedShots||[])].map(s=>s.id));
function validateProject(p){
 if(!p||!Array.isArray(p.shots)||!p.shots.length)throw Error('No shot data found.');
 const ids=p.shots.map(s=>s.id);if(p.version===base.version&&(ids.length!==base.shots.length||ids.some((id,i)=>id!==base.shots[i].id)))throw Error('Current-revision shot order must match the published edit.');if(new Set(ids).size!==ids.length||ids.some(id=>!knownIds.has(id)))throw Error('Unknown or duplicate shot IDs.');
 for(let i=0;i<p.shots.length;i++){const s=p.shots[i];if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start||Math.abs(s.start-(i?p.shots[i-1].end:0))>.002)throw Error('The imported timeline has gaps or invalid times.');if(typeof s.image!=='string'||!(/^(assets\/[^?#]+\.(png|jpe?g|webp)|data:image\/(png|jpeg|webp);base64,)/i.test(s.image))||s.image.includes('..'))throw Error('Unsupported image reference.');}
 if(Math.abs(p.shots.at(-1).end-base.duration)>.002)throw Error('This is not the 4:33.285 master timeline.');return true;
}
function migrateProject(project){
 validateProject(project);const out=clone(base),byId=new Map(project.shots.map(s=>[s.id,s]));
 const sameRevision=project.version===base.version;
 const legacyArchive=clone(project.archivedShots||[]);
 out.migrationHistory=clone(project.migrationHistory||[]);
 if(!sameRevision)out.migrationHistory.push({from:project.version||'unversioned',to:base.version,sourceShots:clone(project.shots),note:'Original imported records preserved here. Active edit uses the new timing. Notes and detectable artwork/direction changes remain local overrides.'});
 for(const current of out.shots){const old=byId.get(current.id);if(!old)continue;const baseline=sameRevision?base.shots.find(s=>s.id===current.id):(base.migrationBaselines?.[project.version]?.[current.id]||(base.migrationBaselines?.[project.version]?.[current.id]||base.migrationBaseline?.[current.id]));
  const overrides=clone(old.userOverrides||{});
  for(const field of editable){if(old[field]===undefined)continue;if(field==='notes'||(baseline&&old[field]!==baseline[field]))overrides[field]=old[field];}
  for(const [field,value]of Object.entries(overrides))if(editable.includes(field)){current[field]=value;}
  current.userOverrides=overrides;
  if(sameRevision){current.start=old.start;current.end=old.end;}
 }
 const archived=new Map(out.archivedShots.map(s=>[s.id,s]));
 for(const old of [...legacyArchive,...project.shots.filter(s=>!out.shots.some(b=>b.id===s.id))])archived.set(old.id,{...archived.get(old.id),...clone(old),retirementReason:archived.get(old.id)?.retirementReason||old.retirementReason||'Retained from imported project.'});
 out.archivedShots=[...archived.values()];return out;
}
let data=clone(base),migrationMessage='';
try{let raw=localStorage.getItem(storageKey);if(raw)data=migrateProject(JSON.parse(raw));else{raw=localStorage.getItem(legacyKey);if(raw){data=migrateProject(JSON.parse(raw));localStorage.setItem(storageKey,JSON.stringify(data));migrationMessage='Copied available original-browser notes, custom images and directions into this independent edit. The original storage was not changed.';}}}catch(e){migrationMessage='Saved data was not loaded: '+e.message+' The published edit is shown; existing storage has not been removed.';}
const audio=$('audio');let index=-1,loopId=null,pendingSeek=null,lastLyric='';
const fmt=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(3).padStart(6,'0');
const names={'1_story':'1 · Story and emotional progression','2_changes':'2 · Shot changes and rationale','3_timing':'3 · Timing, music and source handles','4_continuity':'4 · Continuity, costume and geography','5_still':'5 · Still composition and first instant','6_performance':'6 · Performance and body language','7_motion':'7 · Full clip action and camera','8_editing':'8 · Cuts, transitions and future subshots','9_generation':'9 · First / end frames and animation handoff','10_review':'10 · Review, checks and provenance'};
const pretty=k=>k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
function say(t){$('status').textContent=t;}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(data));say('Saved in this copy. Export JSON to keep a portable backup.');}catch(e){say('Browser storage unavailable or full. Export project JSON to preserve your changes.');}}
function addValue(parent,value){
 if(Array.isArray(value)){for(const item of value){const block=document.createElement('div');block.className='beat';if(item&&typeof item==='object'&&item.path){const a=document.createElement('a');a.href=item.path;a.textContent=item.path;a.target='_blank';block.append(a,document.createTextNode('\n'+item.role));}else if(item&&typeof item==='object'&&'from'in item){block.textContent=item.from.toFixed(3)+'–'+item.to.toFixed(3)+'s · '+item.direction;}else block.textContent=typeof item==='object'?JSON.stringify(item,null,2):String(item);parent.append(block);}}else parent.textContent=value===null?'Not required for this shot.':typeof value==='object'?JSON.stringify(value,null,2):String(value);
}
function categoryUI(s){const wrap=$('categories');wrap.replaceChildren();for(const [key,values]of Object.entries(s.production||{})){const d=document.createElement('details'),sum=document.createElement('summary'),body=document.createElement('div');sum.textContent=names[key]||key;body.className='category-content';if(['6_performance','7_motion'].includes(key))d.open=true;for(const [label,value]of Object.entries(values)){const entry=document.createElement('div'),title=document.createElement('div'),content=document.createElement('div');entry.className='entry';title.className='entry-label';title.textContent=pretty(label);content.className='entry-value';addValue(content,value);entry.append(title,content);body.append(entry);}d.append(sum,body);wrap.append(d);}}

// Published AI edits stay separate from user notes/artwork overrides.
const publishedEdits=window.STORYBOARD_EDITS;
function editTags(s){const e=publishedEdits.shots[s.id];return [e.added&&['new','New shot'],e.artwork&&['art','Artwork'],e.timing&&['time','Timing'],e.direction&&['direction','Direction']].filter(Boolean);}
function editBadges(s){const wrap=document.createElement('div');wrap.className='edit-badges';for(const [kind,label]of editTags(s)){const tag=document.createElement('span');tag.className='edit-badge edit-'+kind;tag.textContent=label;wrap.append(tag);}return wrap;}
function editClass(s){const e=publishedEdits.shots[s.id];return e.added?' shot-added':e.artwork?' art-changed':'';}
function matchesEdit(s,filter){const e=publishedEdits.shots[s.id];return !filter||filter==='all'||(filter==='unchangedArt'?!e.artwork:!!e[filter]);}
function changesUI(s){const e=publishedEdits.shots[s.id],wrap=$('editPanel');wrap.replaceChildren();const title=document.createElement('strong');title.textContent='AI edit · compared with the original';wrap.append(title,editBadges(s));const line=t=>{const p=document.createElement('p');p.textContent=t;wrap.append(p);};
 if(e.artwork)line(e.artwork);else line('Original artwork retained. The badges below the thumbnails distinguish written direction and timing changes from image changes.');
 if(e.oldTiming){line((e.timing?'Timing changed: ':'Timing retained: ')+e.oldTiming.map(fmt).join(' — ')+(e.timing?' → '+e.newTiming.map(fmt).join(' — '):''));}else line('Added to this cut: '+e.newTiming.map(fmt).join(' — ')+'.');
 if(e.direction)line('Revised shot description / animation brief, including acting, camera and continuity. See the ten categories below.');
 if(s.start!==e.newTiming[0]||s.end!==e.newTiming[1])line('Your locally saved timing differs from the published AI edit shown here. The player uses your saved timing.');
 if(s.userOverrides?.image)line('A locally saved image override is displayed. Artwork badges refer to the published AI revision.');
 if(e.artwork&&e.oldImage){const details=document.createElement('details'),summary=document.createElement('summary'),im=document.createElement('img');summary.textContent='View original image before this edit';im.src=e.oldImage;im.alt=s.id+' original image before the AI edit';im.loading='lazy';details.append(summary,im);wrap.append(details);}
}
function editOverview(){const all=Object.values(publishedEdits.shots);$('editCounts').textContent=$('grid').children.length+' of '+data.shots.length+' shots shown · '+all.filter(e=>e.artwork).length+' new / corrected images · '+all.filter(e=>e.added).length+' added shot · '+all.filter(e=>e.timing).length+' retimed shots · '+all.filter(e=>e.direction).length+' existing briefs revised.';$('retiredEdits').replaceChildren();const retired=Object.entries(publishedEdits.retired);$('retiredSummary').textContent=retired.length+' shots removed from this cut · preserved in archive';for(const [id,reason]of retired){const p=document.createElement('p');p.textContent=id+' — '+reason;$('retiredEdits').append(p);}}

function render(i){if(i===index)return;index=i;const s=data.shots[i];$('frame').src=s.image;$('frame').alt=s.description;$('slate').textContent=s.id+' · '+(i+1)+' / '+data.shots.length;$('heading').textContent=s.id+' · '+(s.end-s.start).toFixed(3)+'s';$('section').textContent=s.section;$('range').textContent=fmt(s.start)+' — '+fmt(s.end);for(const [ui,field]of [['action','description'],['angle','angle'],['lens','lens'],['movement','movement'],['purpose','purpose'],['transition','transition'],['notes','notes']])$(ui).textContent=s[field]||'';categoryUI(s);changesUI(s);$('editAction').value=s.description;$('editMovement').value=s.movement;$('editAngle').value=s.angle;$('editNotes').value=s.notes||'';$('imageInput').value='';$('previous').disabled=i===0;$('next').disabled=i===data.shots.length-1;const overrides=Object.keys(s.userOverrides||{}).filter(x=>x!=='notes');$('overrideNotice').hidden=!overrides.length;$('overrideNotice').textContent='Preserved local overrides: '+overrides.join(', ')+'. The ten-category authored brief remains available below; exported packets include both for reconciliation before generation.';document.querySelectorAll('[data-shot]').forEach(el=>el.classList.toggle('active',el.dataset.shot===s.id));document.querySelectorAll('.segment').forEach(el=>el.classList.toggle('active',el.dataset.scene===s.section));const thumb=$('strip').querySelector('[data-shot="'+s.id+'"]');if(thumb)$('strip').scrollLeft=thumb.offsetLeft-$('strip').offsetLeft-$('strip').clientWidth/2+57;}
// Timeline-driven opacity keeps transitions deterministic when paused, sought or looped.
function updateFade(t){
 const s=data.shots[index],effect=s?.previewTransition,local=t-(s?.start||0);
 const ramp=(start,end)=>Math.max(0,Math.min(1,(local-start)/(end-start)));
 let opacity=0;
 if(effect?.fadeOut)opacity=Math.max(opacity,ramp(effect.fadeOut.start,effect.fadeOut.end));
 if(effect?.fadeIn)opacity=Math.max(opacity,1-ramp(effect.fadeIn.start,effect.fadeIn.end));
 $('fade').style.opacity=String(opacity);
 const overlay=$('dissolveFrame'),dissolve=effect?.dissolve;
 const source=dissolve&&data.shots.find(x=>x.id===dissolve.fromShot);
 if(source){
  if(overlay.dataset.image!==source.image){overlay.src=source.image;overlay.dataset.image=source.image;}
  const progress=ramp(dissolve.start,dissolve.end);
  const eased=dissolve.easing==='smoothstep'?progress*progress*(3-2*progress):progress;
  overlay.style.opacity=String(1-eased);overlay.hidden=eased>=1;
 }else{overlay.style.opacity='0';overlay.hidden=true;}
}
function seek(i){i=Math.max(0,Math.min(data.shots.length-1,i));const s=data.shots[i];loopId=s.id;pendingSeek=s.start+.001;audio.currentTime=pendingSeek;render(i);updateFade(pendingSeek);updateClock(pendingSeek);}
function updateClock(t){$('clock').textContent=fmt(t)+' / '+fmt(data.duration);const l=data.lyrics.find(x=>t>=x.start&&t<x.end);const lyric=l?l.text:'Instrumental / space between lines';if(lyric!==lastLyric){$('lyric').textContent=lyric;lastLyric=lyric;}}
function tick(){let t=audio.currentTime||0;if(pendingSeek!==null){if(audio.seeking)t=pendingSeek;else pendingSeek=null;}if($('loop').checked&&loopId&&!audio.paused){const s=data.shots.find(x=>x.id===loopId);if(s&&t>=s.end){audio.currentTime=s.start+.001;t=audio.currentTime;}}let i=data.shots.findIndex(s=>t>=s.start&&t<s.end);if(i<0)i=t>=data.duration?data.shots.length-1:0;render(i);updateFade(t);updateClock(t);requestAnimationFrame(tick);}
function imageNode(s){const im=document.createElement('img');im.src=s.image;im.alt=s.description;im.loading='lazy';return im;}
function board(){const q=$('search').value.toLowerCase();$('strip').replaceChildren();$('grid').replaceChildren();data.shots.forEach((s,i)=>{const thumb=document.createElement('button'),label=document.createElement('span');thumb.className='thumb'+editClass(s);thumb.dataset.shot=s.id;thumb.title=s.id+' · '+s.section;label.textContent=s.id+' · '+fmt(s.start).slice(0,5);thumb.append(imageNode(s),label,editBadges(s));thumb.onclick=()=>seek(i);$('strip').append(thumb);if(matchesEdit(s,$('editFilter').value)&&(s.id+' '+s.section+' '+s.description+' '+s.purpose+' '+s.movement).toLowerCase().includes(q)){const card=document.createElement('button'),caption=document.createElement('div'),strong=document.createElement('strong'),p=document.createElement('p');card.className='card'+editClass(s);card.dataset.shot=s.id;caption.className='caption';strong.textContent=s.id+' · '+fmt(s.start).slice(0,5)+' · '+(s.end-s.start).toFixed(2)+'s';p.textContent=s.section;caption.append(strong,p,editBadges(s));card.append(imageNode(s),caption);card.onclick=()=>{seek(i);$('screen').scrollIntoView({block:'start',behavior:'smooth'});};$('grid').append(card);}});editOverview();$('summary').textContent=data.shots.length+' shots · 4:33 · 16:9';$('timeline').replaceChildren();for(const name of [...new Set(data.shots.map(s=>s.section))]){const list=data.shots.filter(s=>s.section===name),button=document.createElement('button');button.className='segment';button.dataset.scene=name;button.style.flex=list.at(-1).end-list[0].start;button.title=name;button.setAttribute('aria-label',name);button.onclick=()=>seek(data.shots.indexOf(list[0]));$('timeline').append(button);}index=-1;}
function sceneUI(){$('scenePlans').replaceChildren();for(const sc of data.scenePlans){const box=document.createElement('div'),button=document.createElement('button');box.className='scene';button.textContent=sc.name+' · '+sc.first+'–'+sc.last;button.onclick=()=>seek(data.shots.findIndex(s=>s.id===sc.first));box.append(button);for(const field of ['story','music','changes','rhythm','continuity','look','acting','camera','editing','production','review']){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=pretty(field)+': ';p.append(b,document.createTextNode(sc[field]));box.append(p);}$('scenePlans').append(box);}$('archive').replaceChildren();for(const s of data.archivedShots||[]){const p=document.createElement('p');p.textContent=s.id+' — '+s.retirementReason+(s.notes?' Saved note: '+s.notes:'');$('archive').append(p);}const note=document.createElement('p');note.textContent='Retired shots and any imported personal records remain in project JSON. Unused retired artwork stays in the original source archive; active previous frames are included in this clean copy. '+(data.migrationHistory?.length||0)+' migration snapshot(s) retained.';$('archive').append(note);}
function download(name,value,type='application/json'){const b=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('play').onclick=()=>audio.paused?audio.play().catch(()=>say('Use the native audio play control to start playback.')):audio.pause();audio.onplay=()=>{$('play').textContent='Pause song';if(!loopId)loopId=data.shots[index].id;};audio.onpause=()=>{$('play').textContent='Play song';};$('previous').onclick=()=>seek(index-1);$('next').onclick=()=>seek(index+1);$('replay').onclick=()=>{seek(index);audio.play().catch(()=>{});};$('loop').onchange=()=>loopId=data.shots[index].id;$('editFilter').onchange=()=>{const old=index;board();render(old<0?0:old);};$('search').oninput=()=>{const old=index;board();render(old<0?0:old);};
$('editform').onsubmit=e=>{e.preventDefault();const s=data.shots[index];const edits={description:$('editAction').value,movement:$('editMovement').value,angle:$('editAngle').value,notes:$('editNotes').value};Object.assign(s,edits);s.userOverrides={...s.userOverrides,...edits};save();const old=index;board();render(old);};
$('imageInput').onchange=e=>{const file=e.target.files[0];if(!file)return;const target=data.shots[index],reader=new FileReader();reader.onload=()=>{target.image=reader.result;target.userOverrides={...target.userOverrides,image:reader.result};save();const old=index;board();render(old);};reader.readAsDataURL(file);};
$('export').onclick=()=>download('no-way-back-storyboard-ai-edit-project.json',data);
$('packet').onclick=()=>download(data.shots[index].id+'-animation-handoff.json',data.shots[index]);
$('copyPrompt').onclick=async()=>{const s=data.shots[index];let prompt=s.production['9_generation'].videoPrompt;if(Object.keys(s.userOverrides||{}).some(k=>k!=='notes'))prompt+='\nUser local overrides for reconciliation: '+JSON.stringify(Object.fromEntries(Object.entries(s.userOverrides).filter(([k])=>k!=='image')))+(s.userOverrides.image?' Use the custom image included in the exported project as the composition reference.':'');try{await navigator.clipboard.writeText(prompt);say('Animation prompt copied. Reference images and keyframe instructions are in the shot packet.');}catch{download(s.id+'-animation-prompt.txt',prompt,'text/plain');say('Prompt downloaded because clipboard access is unavailable.');}};
$('import').onchange=async e=>{try{const p=JSON.parse(await e.target.files[0].text());data=migrateProject(p);save();board();sceneUI();seek(0);say('Imported into AI Edit. Personal records preserved; retired-shot records remain in the archive.');}catch(err){say('Import failed: '+err.message);}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('screen').requestFullscreen();}catch{say('Full screen is unavailable in this browser.');}};document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreen').textContent=active?'Exit full screen':'⛶ Full screen';$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',active?'Exit full screen':'Enter full screen');});
document.addEventListener('keydown',e=>{
 const focused=e.target||document.activeElement;
 if(e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||focused?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(focused?.tagName))return;
 const key=e.key||e.code;
 if(key==='ArrowLeft'||key==='ArrowRight'){
  e.preventDefault();e.stopPropagation();
  const button=$(key==='ArrowLeft'?'previous':'next');
  if(!button.disabled)button.click();
 }else if(e.code==='Space'&&focused?.tagName!=='BUTTON'){
  e.preventDefault();$('play').click();
 }
},true);audio.onerror=()=>say('Audio could not load. Keep song.mp3 beside this page.');
board();sceneUI();render(0);say(migrationMessage);requestAnimationFrame(tick);
