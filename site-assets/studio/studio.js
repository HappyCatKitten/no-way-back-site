/* Read-only public experiments. Canonical shot files and artwork are never mutated. */
(() => {
 'use strict';
 const d=window.NWB_STUDIO;if(!d)return;
 const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=new Map(d.shots.map(s=>[s.id,s]));const clock=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
 const shotAt=t=>d.shots.find(s=>t>=s.start&&t<s.end)||d.shots[d.shots.length-1];
 const sections=[...new Set(d.shots.map(s=>s.section))];const a=$('studioAudio');let currentTime=byId.get('S078A').start,lastShot='',lastLine='',scope=[0,d.duration],switchToken=0;
 function populate(id,items,selected){$(id).innerHTML=items.map(s=>`<option value="${esc(s.id)}">${esc(s.id)} · ${clock(s.start)} · ${esc(s.section.split(' · ')[1])}</option>`).join('');$(id).value=selected;}
 ['studioShot','evolutionShot','recipeShot','colourShot'].forEach(id=>populate(id,d.shots,{studioShot:'S078A',evolutionShot:'S015B',recipeShot:'S090',colourShot:'S053'}[id]));
 $('studioVersion').textContent=d.version;
 $('timelineScope').innerHTML+=sections.map((s,i)=>`<option value="${i}">${esc(s)}</option>`).join('');
 $('lyricList').innerHTML=d.lyrics.map(l=>`<button data-line="${l.id}" title="${esc(l.section)}">${clock(l.start)} · ${esc(l.text)}</button>`).join('');
 function update(t){
  currentTime=Math.max(0,Math.min(d.duration,t));const s=shotAt(currentTime);$('studioClock').textContent=clock(currentTime);$('studioSeek').value=currentTime;
  if(s.id!==lastShot){lastShot=s.id;$('musicFrame').src=s.image;$('musicFrame').alt=s.description;$('musicShotBadge').textContent=`${s.id} · ${clock(s.start)}–${clock(s.end)}`;$('studioShot').value=s.id;$('musicSection').textContent=s.section;
   $('directorOverlay').innerHTML=`<strong>${esc(s.angle)} · ${esc(s.lens)}</strong><p>${esc(s.movement)}</p><p>${esc(s.emotion)}</p>`;}
  const l=d.lyrics.find(l=>currentTime>=l.start-.12&&currentTime<l.end+.65);const lid=l?l.id:'gap';
  if(lid!==lastLine){lastLine=lid;$('liveLyrics').innerHTML=l?l.words.map((w,i)=>`<span data-word="${i}" class="${w.flags.length?'flagged':''}">${esc(w.word)} </span>`).join(''):'<span>Let the music breathe.</span>';$('lyricHint').textContent=l?l.section:'Instrumental / space between phrases';
   $('lyricList').querySelectorAll('button').forEach(b=>b.classList.toggle('current-line',Number(b.dataset.line)===lid));}
  if(l)$('liveLyrics').querySelectorAll('span').forEach((el,i)=>{const w=l.words[i];el.classList.toggle('active',currentTime>=w.start&&currentTime<w.end);el.classList.toggle('sung',currentTime>=w.end);});
  const playhead=$('timelinePlayhead');if(playhead)playhead.setAttribute('x1',Math.max(0,Math.min(900,(currentTime-scope[0])/(scope[1]-scope[0])*900))),playhead.setAttribute('x2',playhead.getAttribute('x1'));
 }
 function seek(t){a.currentTime=t;update(t);}
 function drawTimeline(){
  const x=t=>(t-scope[0])/(scope[1]-scope[0])*900;const max=Math.max(...d.waveform);let wave='';
  d.waveform.forEach((v,i)=>{const t=i/900*d.duration;if(t<scope[0]||t>scope[1])return;const height=v/max*36;wave+=`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${45-height}" y2="${45+height}" stroke="#96b2ef" stroke-width="1.5"/>`;});
  const beats=d.beats.filter(b=>b.t>=scope[0]&&b.t<=scope[1]).map(b=>`<line x1="${x(b.t)}" x2="${x(b.t)}" y1="85" y2="${b.review?91:95}" stroke="${b.review?'#895d88':'#e09bd0'}"/>`).join('');
  const shots=d.shots.filter(s=>s.end>scope[0]&&s.start<scope[1]).map((s,i)=>`<rect x="${Math.max(0,x(s.start))}" y="101" width="${Math.max(1,Math.min(900,x(s.end))-Math.max(0,x(s.start)))}" height="9" fill="${i%2?'#7a9460':'#dfff9a'}"><title>${esc(s.id)} · ${esc(s.description)}</title></rect>`).join('');
  $('musicTimeline').innerHTML=`<svg viewBox="0 0 900 115" aria-label="Waveform, detected beats and shot boundaries; use song position slider for keyboard seeking">${wave}${beats}${shots}<line id="timelinePlayhead" x1="0" x2="0" y1="0" y2="115" stroke="white" stroke-width="2"/></svg>`;
  $('musicTimeline').querySelector('svg').addEventListener('pointerdown',e=>{const r=e.currentTarget.getBoundingClientRect();seek(scope[0]+Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*(scope[1]-scope[0]));});update(currentTime);
 }
 $('timelineScope').addEventListener('change',e=>{if(e.target.value==='all')scope=[0,d.duration];else{const selected=d.shots.filter(s=>s.section===sections[Number(e.target.value)]);scope=[selected[0].start,selected[selected.length-1].end];}drawTimeline();});
 $('studioShot').addEventListener('change',e=>seek(byId.get(e.target.value).start));$('studioSeek').addEventListener('input',e=>seek(Number(e.target.value)));
 $('directorOverlay').hidden=!$('directorMode').checked;
 $('directorMode').addEventListener('change',e=>$('directorOverlay').hidden=!e.target.checked);
 $('lyricList').addEventListener('click',e=>{const b=e.target.closest('button');if(b){seek(d.lyrics.find(l=>l.id===Number(b.dataset.line)).start);a.play().catch(()=>{});}});
 a.addEventListener('timeupdate',()=>update(a.currentTime));a.addEventListener('seeked',()=>update(a.currentTime));a.addEventListener('ended',()=>update(d.duration));
 // Update the visual words smoothly while playing; timeupdate alone can miss short words.
 function tick(){if(!a.paused)update(a.currentTime);requestAnimationFrame(tick);}requestAnimationFrame(tick);
 a.addEventListener('loadedmetadata',()=>{if(switchToken===0)a.currentTime=currentTime;},{once:true});
 document.querySelectorAll('[data-stem]').forEach(b=>b.addEventListener('click',()=>{
  const t=currentTime,playing=!a.paused,token=++switchToken;const url=b.dataset.stem==='mix'?'outputs/storyboard-ai-edit/song.mp3':`site-assets/studio/${b.dataset.stem}.mp3`;
  const ready=()=>{if(token!==switchToken)return;a.currentTime=Math.min(t,a.duration);update(t);if(playing)a.play().catch(()=>{});};a.addEventListener('loadedmetadata',ready,{once:true});a.src=url;a.load();
  document.querySelectorAll('[data-stem]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 }));
 $('studioPlay').addEventListener('click',()=>{if(a.paused)a.play().catch(()=>{$('lyricHint').textContent='Press the audio player’s play control to start playback.';});else a.pause();});
 a.addEventListener('play',()=>{$('studioPlay').textContent='Pause excerpt';});a.addEventListener('pause',()=>{$('studioPlay').textContent='Play excerpt';});
 const film=document.querySelector('video');a.addEventListener('play',()=>film?.pause());film?.addEventListener('play',()=>a.pause());
 const dialog=$('screenshotDialog');function enlarge(path,caption,alt){$('screenshotPreview').src=path;$('screenshotPreview').alt=alt;$('screenshotTitle').textContent=caption;dialog.showModal();}
 function renderCast(group='all'){$('fullCast').innerHTML=d.cast.filter(c=>group==='all'||c.group===group).map(c=>`<article class="reference-card"><button data-reference="${esc(c.path)}" data-title="${esc(c.title)}" aria-label="Enlarge ${esc(c.title)}"><img loading="lazy" src="${esc(c.path)}" alt="${esc(c.caption)}"></button><div class="ref-copy"><b>${esc(c.title)}</b><p>${esc(c.caption)}</p></div></article>`).join('');}
 $('fullCast').addEventListener('click',e=>{const b=e.target.closest('button');if(b)enlarge(b.dataset.reference,b.dataset.title,b.querySelector('img').alt);});document.querySelectorAll('[data-cast]').forEach(b=>b.addEventListener('click',()=>{renderCast(b.dataset.cast);document.querySelectorAll('[data-cast]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));renderCast();
 const threads={wardrobe:['S006','S020','S045','S055','S078A','S090'],case:['S029','S033','S044A','S044B'],contacts:['S025','S027','S028','S064'],apartment:['S015B','S015C','S054B','S055']};
 function continuity(){const type=$('continuityThread').value;$('continuityCards').innerHTML=threads[type].filter(id=>byId.has(id)).map(id=>{const s=byId.get(id),text=type==='apartment'?s.geography:s.costume;return `<article class="continuity-item"><img loading="lazy" src="${esc(s.image)}" alt="${esc(s.description)}"><div><b>${s.id} · ${clock(s.start)}</b><p>${esc(text.length>170?text.slice(0,167)+'…':text)}</p>${text.length>170?`<details><summary>Full continuity note</summary><p>${esc(text)}</p></details>`:''}</div></article>`;}).join('');}
 $('continuityThread').addEventListener('change',continuity);continuity();
 $('paletteScene').innerHTML=d.palettes.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('paletteScene').value='arcade';
 const sceneIds={master:'S005',heroine:'S028',support:'S033',wardrobe:'S045',city:'S004',home:'S055',market:'S025',elevator:'S033',arcade:'S053',world:'S097B',stage:'S090'};
 function palette(){const p=d.palettes.find(p=>p.id===$('paletteScene').value),s=byId.get(sceneIds[p.id])||d.shots[0];$('paletteFrame').src=s.image;$('paletteFrame').alt=s.description;$('paletteSwatches').innerHTML=p.colours.map(c=>`<span class="palette-chip"><i style="--color:${esc(c.hex)}"></i>${esc(c.name)}<br>${esc(c.hex)}</span>`).join('');$('paletteRule').textContent=p.rule;$('colourShot').value=s.id;colour();}
 $('paletteScene').addEventListener('change',palette);palette();
 function colour(){const s=byId.get($('colourShot').value);$('colourStats').textContent=`${s.id}: mean brightness ${s.stats.meanLuma}% · mean saturation ${s.stats.meanSaturation}%. ${d.analysisNote}`;
  const x=t=>35+t/d.duration*430,y=v=>130-v;const points=d.shots.map(s=>[x(s.start),y(s.stats.meanLuma)]),sat=d.shots.map(s=>[x(s.start),y(s.stats.meanSaturation)]);
  $('colourChart').innerHTML=`<svg viewBox="0 0 500 165" role="img" aria-label="Whole film brightness and saturation by shot"><text x="20" y="18" fill="#9cbbff" font-size="10">Brightness</text><text x="110" y="18" fill="#ed9bcc" font-size="10">Saturation</text><line x1="35" x2="465" y1="130" y2="130" stroke="#555"/><polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#9cbbff" stroke-width="1.5"/><polyline points="${sat.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ed9bcc" stroke-width="1.5"/><line x1="${x(s.start)}" x2="${x(s.start)}" y1="28" y2="135" stroke="#dfff9a"/><text x="35" y="151" fill="#aaa" font-size="10">0:00</text><text x="440" y="151" fill="#aaa" font-size="10">4:33</text></svg>`;}
 $('colourShot').addEventListener('change',()=>{colour();const s=byId.get($('colourShot').value);$('paletteFrame').src=s.image;$('paletteFrame').alt=s.description;});colour();
 function evolution(){const s=byId.get($('evolutionShot').value),frames=[{path:s.earlier,label:'Earlier selected frame',size:s.earlierSize},{path:s.intermediate,label:'First detail pass',size:[1672,941]},{path:s.image,label:'Current approved frame',size:s.size}].filter(f=>f.path);$('evolutionFrames').classList.toggle('two',frames.length===2);$('evolutionFrames').innerHTML=frames.map(f=>`<figure><img loading="lazy" src="${esc(f.path)}" alt="${esc(f.label)} of ${esc(s.description)}"><figcaption>${esc(f.label)}<small>${f.size?f.size.join(' × '):'Native reference'} · ${s.id}</small></figcaption></figure>`).join('');$('evolutionReason').textContent=s.artReview.length>650?s.artReview.slice(0,647)+'…':s.artReview;}
 $('evolutionShot').addEventListener('change',evolution);evolution();
 function recipe(){const s=byId.get($('recipeShot').value);$('recipeFrame').src=s.image;$('recipeFrame').alt=s.description;$('recipeStatus').textContent=`${s.id} · ${(s.end-s.start).toFixed(3)} s in the edit. ${s.generationStatus}`;$('artRecipe').textContent=s.artPrompt;$('firstRecipe').textContent=s.firstFramePrompt;$('videoRecipe').textContent=s.videoPrompt;$('downloadRecipe').href=`site-assets/studio/recipes/${s.id}.txt`;$('recipeRefs').innerHTML=s.references.map(r=>`<a href="${esc(r.path)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(r.path)}" alt="${esc(r.role)}">${esc(r.role)}</a>`).join('');}
 $('recipeShot').addEventListener('change',recipe);recipe(); const cameraScenes={apartment:{id:'S006',labels:['Her sofa','Window plane'],note:'Keep the sofa, window and skyline as fixed landmarks. Camera changes must not move the furniture.'},elevator:{id:'S033',labels:['Her position','His position'],note:'Her left / ex right on the established axis. A reverse needs a motivated eyeline, and reflections remain subtle.'},arcade:{id:'S054',labels:['Red controls','Blue controls'],note:'Keep both control sets on the cabinet’s front deck. Preserve her left / friend right relationship.'}};
 function camera(){const scene=cameraScenes[$('cameraLocation').value],s=byId.get(scene.id),i=Number($('cameraAngle').value),positions=[[240,170],[90,145],[390,145],[240,55],[175,135]],p=positions[i],names=['Front axis','Left oblique','Right oblique','High angle','Close detail'];$('cameraFrame').src=s.image;$('cameraFrame').alt=s.description;$('cameraDiagram').innerHTML=`<svg viewBox="0 0 480 210" role="img" aria-label="${esc(names[i])} camera concept"><path d="M70 45 H410 V190 H70 Z" fill="none" stroke="#5d536a" stroke-dasharray="5 5"/><rect x="155" y="76" width="170" height="24" rx="5" fill="#434159"/><circle cx="195" cy="115" r="12" fill="#ff97c0"/><circle cx="285" cy="115" r="12" fill="#96b2ef"/><text x="195" y="142" fill="#ddd" font-size="9" text-anchor="middle">${esc(scene.labels[0])}</text><text x="285" y="142" fill="#ddd" font-size="9" text-anchor="middle">${esc(scene.labels[1])}</text><line x1="${p[0]}" y1="${p[1]}" x2="240" y2="95" stroke="#dfff9a" stroke-width="2"/><circle cx="${p[0]}" cy="${p[1]}" r="14" fill="#dfff9a"/><text x="${p[0]}" y="${p[1]+4}" fill="#172015" text-anchor="middle" font-size="12">C</text></svg>`;$('cameraExplanation').textContent=`${names[i]} · ${scene.note} Current ${s.id}: ${s.angle}. ${s.movement}`;}
 $('cameraLocation').addEventListener('change',camera);$('cameraAngle').addEventListener('input',camera);camera();drawTimeline();update(currentTime);
})();
