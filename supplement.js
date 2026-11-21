(() => {
  'use strict';
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for (const root of document.querySelectorAll('[data-gallery]')) {
    const data=window.SUPPLEMENT_DATA[root.dataset.gallery];
    if (!data || !data.cases.length) continue;
    let selected=0, playing=false, seekBusy=false, playToken=0;
    root.innerHTML=`<div class="supp-toolbar"><label>Case <select class="supp-case" aria-label="${escape(root.dataset.gallery)} case">${data.cases.map((c,i)=>`<option value="${i}">${escape(c.title.split(' · ')[0])}</option>`).join('')}</select></label><button data-action="previous">Previous</button><button data-action="next">Next</button><button data-action="play">Play all from start</button><button data-action="pause">Pause all</button></div><details class="supp-prompt"><summary>View full prompt / scene</summary><p></p></details><div class="supp-event" hidden></div><div class="supp-grid-wrap"><div class="supp-grid" data-columns="${data.labels.length}" style="--cols:${data.labels.length}">${data.labels.map(label=>`<article class="supp-card"><h3>${escape(label)}</h3><video controls muted playsinline preload="metadata"></video><a class="supp-open" target="_blank" rel="noopener">Open video</a><div class="supp-error"></div></article>`).join('')}</div></div><label class="supp-seek">Seek all <input type="range" min="0" max="15.041667" step="0.041667" value="0" aria-label="Seek all videos"><output>0.00 s</output></label><p class="supp-status" aria-live="polite"></p>`;
    const videos=[...root.querySelectorAll('video')], select=root.querySelector('.supp-case'), slider=root.querySelector('input[type=range]'), output=root.querySelector('output'), status=root.querySelector('.supp-status'), event=root.querySelector('.supp-event');
    const setStatus=t=>status.textContent=t;
    function pause(){playing=false;playToken++;videos.forEach(v=>v.pause());}
    function setEvent(t){const ev=data.cases[selected].events;if(!ev){event.hidden=true;return;}const active=[...ev].reverse().find(e=>e.time<=t+.001)||ev[0];event.hidden=false;event.innerHTML=`<span class="supp-event-time">${active.time.toFixed(2)} s · User instruction:</span> ${escape(active.text)}`;}
    function seek(t){seekBusy=true;videos.forEach(v=>{if(v.readyState>=1)v.currentTime=Math.min(t,Math.max(0,(v.duration||15.04)-.001));});slider.value=t;output.textContent=t.toFixed(2)+' s';setEvent(t);setTimeout(()=>seekBusy=false,100);}
    function load(i){pause();selected=(i+data.cases.length)%data.cases.length;select.value=selected;const c=data.cases[selected];root.querySelector('.supp-prompt p').textContent=c.prompt;slider.max=c.duration;videos.forEach((v,j)=>{v.poster=c.videos[j].poster;v.src=c.videos[j].src;v.playbackRate=1;v.setAttribute('aria-label',`${c.title}: ${data.labels[j]}`);v.closest('article').querySelector('a').href=v.src;v.closest('article').querySelector('.supp-error').textContent='';v.load();});seek(0);setStatus(`${c.title} · ${selected+1} / ${data.cases.length} · Full video, 24 fps`);}
    function ready(v){return v.readyState>=2?Promise.resolve():new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',done);v.removeEventListener('error',fail);resolve();};const fail=()=>{clearTimeout(timer);reject(new Error('Video could not load'));};const timer=setTimeout(fail,20000);v.addEventListener('loadeddata',done,{once:true});v.addEventListener('error',fail,{once:true});});}
    root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;switch(b.dataset.action){case'previous':load(selected-1);break;case'next':load(selected+1);break;case'pause':pause();setStatus('Paused');break;case'play':{pause();const token=playToken;setStatus('Loading matched videos…');try{await Promise.all(videos.map(ready));if(token!==playToken)return;seek(0);playing=true;await Promise.all(videos.map(v=>v.play()));setStatus('');}catch(err){pause();setStatus('Playback failed. Try opening the individual videos.');}break;}}});
    select.addEventListener('change',()=>load(Number(select.value)));
    slider.addEventListener('input',()=>seek(Number(slider.value)));
    videos.forEach(v=>v.addEventListener('error',()=>{v.closest('article').querySelector('.supp-error').textContent='Video unavailable';}));
    videos[0].addEventListener('timeupdate',()=>{const t=videos[0].currentTime;if(!seekBusy){slider.value=t;output.textContent=t.toFixed(2)+' s';setEvent(t);}if(playing&&!seekBusy)videos.slice(1).forEach(v=>{if(!v.seeking&&Math.abs(v.currentTime-t)>.16)v.currentTime=t;});});
    videos[0].addEventListener('ended',()=>{pause();setStatus('Playback complete');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    load(0);
  }
})();
