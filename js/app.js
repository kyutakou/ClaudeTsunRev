import*as db from './db.js';
import{parse,validateQuestion}from './importer.js';
const $=s=>document.querySelector(s),main=$('#main');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let Q=[],H=[],S=null,R=null,pending=null;
const F={q:'',s:'',t:'',d:''},P={s:'',t:'',n:10,m:'practice'};
const prefs=()=>{try{return JSON.parse(localStorage.getItem('forma.prefs'))||{}}catch{return{}}};
const setPref=(k,v)=>{try{localStorage.setItem('forma.prefs',JSON.stringify({...prefs(),[k]:v}))}catch{}};
const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3500)};
const SP={idle:[2,1,0],happy:[2,0,1],sparkle:[2,1,1],kiss:[2,1,2],shy:[2,0,0],wrong:[1,0,1],pout:[1,0,0],huff:[1,1,0],huh:[1,1,1],hm:[1,0,2]};
const say=a=>a[Math.random()*a.length|0];
const pet=(k='idle',msg='',ms=3500)=>{const el=$('#pet');if(prefs().pet===false){el.hidden=true;return}el.hidden=false;
  const[s,r,c]=SP[k]||SP.idle,sp=el.querySelector('.sprite'),b=el.querySelector('.bubble');
  sp.style.backgroundImage=`url(assets/sprites-${s}.png)`;sp.style.backgroundPosition=`${c*50}% ${r*100}%`;
  b.hidden=!msg;b.textContent=msg;sp.classList.remove('pop');void sp.offsetWidth;if(k!=='idle')sp.classList.add('pop');
  clearTimeout(pet.h);if(k!=='idle')pet.h=setTimeout(()=>pet(),ms)};
const uniq=a=>[...new Set(a)].sort();
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const fmt=d=>new Date(d).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const download=(name,obj)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsText(f)});
const load=async()=>{[Q,H]=await Promise.all([db.all('questions'),db.all('history')]);H.sort((a,b)=>b.date-a.date)};
const stats=()=>{const n=H.reduce((a,h)=>a+h.total,0),c=H.reduce((a,h)=>a+h.correct,0);return{n,c,acc:pct(c,n)}};
const guard=fn=>async(...a)=>{try{await fn(...a)}catch(e){console.error(e);toast('Something went wrong: '+(e.message||e))}};

/* ---------- Views ---------- */
const V={};
V.overview=()=>{const s=stats(),subs=uniq(Q.map(q=>q.subject)),hr=new Date().getHours(),g=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const cnt=x=>Q.filter(q=>q.subject===x).length,max=Math.max(1,...subs.map(cnt));
  return `<header class="top"><div><h1>${g}</h1><p class="muted">${new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p></div></header>
<section class="stats">${[['Questions available',Q.length],['Questions answered',s.n],['Overall accuracy',s.acc],['Completed sessions',H.length]].map(([l,v])=>`<div class="card"><span class="muted">${l}</span><strong>${v}</strong></div>`).join('')}</section>
<div class="cols"><section class="card"><h2>Subject distribution</h2>${subs.length?subs.map(x=>`<div class="bar"><span>${esc(x)}</span><i style="width:${cnt(x)/max*100}%"></i><b>${cnt(x)}</b></div>`).join(''):'<p class="muted">No questions imported yet.</p>'}</section>
<section class="card"><h2>Recent activity</h2>${H.length?H.slice(0,5).map(h=>`<div class="row"><span>${esc(h.label)} · ${h.mode}</span><span>${h.correct}/${h.total} · ${fmt(h.date)}</span></div>`).join(''):'<p class="muted">No sessions completed yet.</p>'}</section></div>
<section class="card"><h2>Quick actions</h2><div class="acts"><a class="btn pri" href="#practice">Start practice</a><a class="btn" href="#import">Import questions</a><a class="btn" href="#bank">Browse bank</a></div></section>`};

const opts=(a,sel,all)=>(all?`<option value="">${all}</option>`:'')+a.map(x=>`<option${x===sel?' selected':''}>${esc(x)}</option>`).join('');
const pool=()=>Q.filter(q=>(!P.s||q.subject===P.s)&&(!P.t||q.topic===P.t));
V.practice=()=>{
  if(S)return sessionView();
  if(R)return resultView(R,true);
  if(!Q.length)return `<h1>Practice</h1><div class="card"><p>Your bank is empty. <a href="#import">Import questions</a> to begin.</p></div>`;
  const topics=uniq(Q.filter(q=>!P.s||q.subject===P.s).map(q=>q.topic)),n=pool().length;
  return `<h1>Practice</h1><form class="card" id="setup"><div class="form"><div><label for="ps">Subject</label><select id="ps" data-in="P" name="s">${opts(uniq(Q.map(q=>q.subject)),P.s,'All subjects')}</select></div>
<div><label for="pt">Topic</label><select id="pt" data-in="P" name="t">${opts(topics,P.t,'All topics')}</select></div>
<div><label for="pn">Number of questions</label><input id="pn" type="number" min="1" max="${n}" value="${Math.min(P.n,n)}" data-in="P" name="n"></div>
<div><label for="pm">Mode</label><select id="pm" data-in="P" name="m"><option value="practice"${P.m==='practice'?' selected':''}>Practice (instant feedback)</option><option value="exam"${P.m==='exam'?' selected':''}>Examination (review at end)</option></select></div></div>
<p class="muted">${n} question${n===1?'':'s'} available with this selection.</p><div class="acts"><button class="btn pri" data-act="start">Start session</button></div></form>`};
const sessionView=()=>{const{items,i,mode}=S,it=items[i],q=it.q,locked=mode==='practice'&&it.pick!=null,last=i===items.length-1;
  return `<div class="card"><p class="muted">Question ${i+1} of ${items.length} · ${mode==='exam'?'Examination':'Practice'} mode</p><progress max="${items.length}" value="${i+(locked?1:0)}"></progress>
<h2 style="margin-top:14px;font-size:17px">${esc(q.question)}</h2><div class="choices" role="group" aria-label="Answer choices">${it.order.map((o,k)=>{const c=locked?(o===q.answer?'ok':o===it.pick?'bad':''):(it.pick===o?'sel':'');return `<button class="choice ${c}" data-act="pick" data-o="${o}"${locked?' disabled':''} aria-pressed="${it.pick===o}"><b>${'ABCD'[k]}</b><span>${esc(q.choices[o])}</span></button>`}).join('')}</div>
${locked?`<div class="expl"><strong class="${it.pick===q.answer?'ok-t':'bad-t'}">${it.pick===q.answer?'Correct':'Incorrect'}</strong>${q.explanation?`<p>${esc(q.explanation)}</p>`:''}</div>`:''}
<div class="acts">${mode==='exam'&&i>0?'<button class="btn" data-act="prev">Previous</button>':''}${last?`<button class="btn pri" data-act="finish"${mode==='practice'&&it.pick==null?' disabled':''}>Finish &amp; submit</button>`:`<button class="btn pri" data-act="next"${mode==='practice'&&it.pick==null?' disabled':''}>Next</button>`}<button class="btn" data-act="quit">Quit</button></div></div>`};
const resultView=(r,fresh)=>`<h1>${fresh?'Session results':esc(r.label)}</h1><div class="card"><div class="stats" style="margin:0"><div><span class="muted">Score</span><strong>${r.correct}/${r.total}</strong></div><div><span class="muted">Accuracy</span><strong>${pct(r.correct,r.total)}</strong></div><div><span class="muted">Mode</span><strong style="font-size:18px">${r.mode==='exam'?'Examination':'Practice'}</strong></div></div></div>
<div class="card"><h2>Review</h2>${r.items.map((it,i)=>{const q=it.q,ok=it.pick===q.answer;return `<div class="q" style="display:block"><p><strong>${i+1}. ${esc(q.question)}</strong></p><p class="${ok?'ok-t':'bad-t'}">${it.pick==null?'Unanswered':'Your answer: '+esc(q.choices[it.pick])}${ok?' ✓':''}</p>${ok?'':`<p class="ok-t">Correct: ${esc(q.choices[q.answer])}</p>`}${q.explanation?`<p class="muted">${esc(q.explanation)}</p>`:''}</div>`}).join('')}</div>${fresh?'<div class="acts"><button class="btn pri" data-act="again">New session</button></div>':''}`;

const filtered=()=>{const t=F.q.toLowerCase();return Q.filter(q=>(!F.s||q.subject===F.s)&&(!F.t||q.topic===F.t)&&(!F.d||q.difficulty===F.d)&&(!t||(q.question+' '+q.choices.join(' ')).toLowerCase().includes(t)))};
const listHtml=()=>{const l=filtered();return `<p class="muted">${l.length} of ${Q.length} questions</p>`+(l.slice(0,200).map(q=>`<div class="q"><div><p>${esc(q.question)}</p><span class="tag">${esc(q.subject)}</span><span class="tag">${esc(q.topic)}</span><span class="tag">${q.difficulty}</span></div><button class="btn sm dng" data-act="delq" data-id="${q.id}" aria-label="Delete question">Delete</button></div>`).join('')||'<p class="muted">No matching questions.</p>')+(l.length>200?'<p class="muted">Showing first 200. Refine filters to see more.</p>':'')};
V.bank=()=>{const sets=[...new Set(Q.map(q=>q.setKey))].sort();
  return `<h1>Question Bank</h1><div class="card"><h2>Question sets</h2>${sets.map(k=>{const[s,t]=k.split('|');return `<div class="row"><span>${esc(s)} — ${esc(t)} · ${Q.filter(q=>q.setKey===k).length}</span><button class="btn sm dng" data-act="delset" data-k="${esc(k)}">Delete set</button></div>`}).join('')||'<p class="muted">No sets yet. <a href="#import">Import questions</a>.</p>'}</div>
<div class="card"><div class="filters"><input type="search" placeholder="Search questions" aria-label="Search" value="${esc(F.q)}" data-in="F" name="q"><select aria-label="Subject" data-in="F" name="s">${opts(uniq(Q.map(q=>q.subject)),F.s,'All subjects')}</select><select aria-label="Topic" data-in="F" name="t">${opts(uniq(Q.filter(q=>!F.s||q.subject===F.s).map(q=>q.topic)),F.t,'All topics')}</select><select aria-label="Difficulty" data-in="F" name="d">${opts(['easy','medium','hard'],F.d,'All difficulties')}</select></div><div id="list">${listHtml()}</div></div>`};

const previewHtml=()=>{if(!pending)return'';const{res,fresh,dups}=pending;
  return `<div class="card"><h2>Preview</h2>${res.errors.map(e=>`<p class="err">${esc(e)}</p>`).join('')}${res.sets.map(s=>`<details open><summary><strong>${esc(s.label)}</strong> — ${s.valid.length} valid${s.errors.length?`, <span class="err">${s.errors.length} error(s)</span>`:''}</summary>${s.errors.slice(0,20).map(e=>`<p class="err">${esc(e)}</p>`).join('')}${s.valid.slice(0,3).map(q=>`<p class="muted">• ${esc(q.question)}</p>`).join('')}</details>`).join('')}
<p style="margin-top:12px"><strong>${fresh.length}</strong> new · <strong>${dups}</strong> duplicate${dups===1?'':'s'} skipped</p><div class="acts"><button class="btn pri" data-act="commit"${fresh.length?'':' disabled'}>Import ${fresh.length} question${fresh.length===1?'':'s'}</button></div></div>`};
V.import=()=>`<h1>Import Questions</h1><div class="card"><label for="json">Paste JSON</label><textarea id="json" spellcheck="false" placeholder='{"subject":"Chemistry","topic":"Atomic Structure","questions":[...]}'></textarea>
<label for="files">…or upload one or more .json files</label><input id="files" type="file" accept=".json,application/json" multiple>
<div class="acts"><button class="btn pri" data-act="validate">Validate &amp; preview</button><a class="btn" href="#import" data-act="sample">Load sample</a></div></div><div id="preview">${previewHtml()}</div>`;

const perf=()=>{const m={};H.forEach(h=>h.items.forEach(it=>{const s=it.q.subject;m[s]=m[s]||[0,0];m[s][1]++;if(it.pick===it.q.answer)m[s][0]++}));return Object.entries(m)};
V.history=()=>{const s=stats();return `<h1>Results &amp; History</h1><section class="stats"><div class="card"><span class="muted">Sessions</span><strong>${H.length}</strong></div><div class="card"><span class="muted">Correct</span><strong>${s.c}</strong></div><div class="card"><span class="muted">Incorrect</span><strong>${s.n-s.c}</strong></div><div class="card"><span class="muted">Accuracy</span><strong>${s.acc}</strong></div></section>
<div class="card"><h2>Subject performance</h2>${perf().length?`<table><tr><th>Subject</th><th>Correct</th><th>Answered</th><th>Accuracy</th></tr>${perf().map(([k,[c,n]])=>`<tr><td>${esc(k)}</td><td>${c}</td><td>${n}</td><td>${pct(c,n)}</td></tr>`).join('')}</table>`:'<p class="muted">No data yet.</p>'}</div>
<div class="card"><h2>Previous sessions</h2>${H.map(h=>`<div class="row"><span>${esc(h.label)} · ${h.mode==='exam'?'Exam':'Practice'}</span><span>${h.correct}/${h.total} (${pct(h.correct,h.total)}) · ${fmt(h.date)} <button class="btn sm" data-act="viewh" data-id="${h.id}">Review</button></span></div>`).join('')||'<p class="muted">No sessions yet.</p>'}</div>`};
V.settings=()=>{const p=prefs();return `<h1>Settings</h1><div class="card"><h2>Preferences</h2><div class="form"><div><label for="dp">Mascot</label><select id="dp" data-in="pref" name="pet"><option value="1"${p.pet!==false?' selected':''}>Show</option><option value="0"${p.pet===false?' selected':''}>Hide</option></select></div><div><label for="dn">Default question count</label><input id="dn" type="number" min="1" max="200" value="${p.n||10}" data-in="pref" name="n"></div><div><label for="dm">Default mode</label><select id="dm" data-in="pref" name="m"><option value="practice"${p.m!=='exam'?' selected':''}>Practice</option><option value="exam"${p.m==='exam'?' selected':''}>Examination</option></select></div></div></div>
<div class="card"><h2>Backup &amp; restore</h2><p class="muted">Backups contain your questions and quiz history. Restoring merges into existing data.</p><div class="acts"><button class="btn pri" data-act="expbank">Export question bank</button><button class="btn" data-act="exphist">Export quiz history</button></div><label for="bk">Restore backup (.json)</label><input id="bk" type="file" accept=".json,application/json"></div>
<div class="card"><h2>Danger zone</h2><div class="acts"><button class="btn dng" data-act="clearhist">Clear quiz history</button><button class="btn dng" data-act="reset">Reset all data</button></div></div>`};

/* ---------- Actions ---------- */
const SAMPLE=`{\n  "subject": "Chemistry",\n  "topic": "Atomic Structure",\n  "questions": [\n    {\n      "type": "multiple_choice",\n      "question": "Which particle has a negative charge?",\n      "choices": ["Proton","Neutron","Electron","Nucleus"],\n      "answer": 2,\n      "explanation": "Electrons carry a negative electric charge.",\n      "difficulty": "easy"\n    }\n  ]\n}`;
const A={
  start(){const pl=shuffle(pool()),n=Math.max(1,Math.min(+P.n||1,pl.length));if(!pl.length)return toast('No questions match.');
    setPref('n',n);S={mode:P.m,i:0,items:pl.slice(0,n).map(q=>({q,order:shuffle([0,1,2,3]),pick:null}))};render()},
  pick(b){const it=S.items[S.i];if(S.mode==='practice'&&it.pick!=null)return;it.pick=+b.dataset.o;
    if(S.mode==='practice'){if(it.pick===it.q.answer){S.streak=(S.streak||0)+1;S.streak>=3?pet('sparkle',`${S.streak} in a row!`):pet('happy',say(['Correct!','Nice one!','You got it!']))}else{S.streak=0;pet('wrong',say(['Oops… read the explanation.','Not quite!','Hmph, that one was tricky.']))}}
    else pet('hm','Hmm… are you sure?');render()},
  next(){S.i++;render()},prev(){S.i--;render()},
  quit(){if(confirm('Quit this session? Progress will be lost.')){S=null;pet('hm','Quitting already?');render()}},
  async finish(){const un=S.items.filter(i=>i.pick==null).length;if(un&&!confirm(`${un} unanswered question(s) will be marked incorrect. Submit?`))return;
    const subs=uniq(S.items.map(i=>i.q.subject));
    R={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:Date.now(),mode:S.mode,label:subs.length>1?'Mixed subjects':`${subs[0]}${P.t?' — '+P.t:''}`,total:S.items.length,correct:S.items.filter(i=>i.pick===i.q.answer).length,items:S.items.map(({q,pick})=>({q:{subject:q.subject,topic:q.topic,question:q.question,choices:q.choices,answer:q.answer,explanation:q.explanation},pick}))};
    S=null;await db.putMany('history',[R]);await load();render();const f=R.correct/R.total;pet(f>=.8?'kiss':f>=.5?'shy':'huff',f>=.8?'Amazing work!':f>=.5?'Not bad! Keep going.':'Hmph! …Let\'s try again.',7000)},
  again(){R=null;render()},
  viewh(b){const h=H.find(x=>x.id===b.dataset.id);if(h)main.innerHTML=resultView(h,false)+'<div class="acts"><a class="btn" href="#history">Back</a></div>'},
  async delq(b){if(!confirm('Delete this question?'))return;await db.delMany('questions',[b.dataset.id]);await load();render()},
  async delset(b){const ids=Q.filter(q=>q.setKey===b.dataset.k).map(q=>q.id);if(!confirm(`Delete this set and its ${ids.length} questions?`))return;await db.delMany('questions',ids);await load();render()},
  sample(e){$('#json').value=SAMPLE},
  async validate(){const srcs=[];const t=$('#json').value.trim();if(t)srcs.push(t);
    for(const f of $('#files').files)try{srcs.push(await readFile(f))}catch{srcs.push('')}
    if(!srcs.length)return toast('Paste JSON or choose a file first.');
    const res={sets:[],errors:[]};srcs.forEach((s,i)=>{const r=parse(s);r.errors.forEach(e=>res.errors.push(srcs.length>1?`Source ${i+1}: ${e}`:e));res.sets.push(...r.sets)});
    const seen=new Set(Q.map(q=>q.id)),fresh=[];let dups=0;
    res.sets.forEach(s=>s.valid.forEach(q=>{if(seen.has(q.id))dups++;else{seen.add(q.id);fresh.push(q)}}));
    pending={res,fresh,dups};$('#preview').innerHTML=previewHtml();const bad=res.errors.length+res.sets.reduce((a,s)=>a+s.errors.length,0);bad?pet('huh','Something looks off…',5000):pet('happy','Looks good!')},
  async commit(){await db.putMany('questions',pending.fresh);toast(`Imported ${pending.fresh.length} questions.`);pet('kiss','New questions! Thank you!',5000);pending=null;await load();location.hash='#bank';render()},
  expbank(){download('forma-backup.json',{app:'forma',version:1,exported:Date.now(),questions:Q,history:H})},
  exphist(){download('forma-history.json',{app:'forma',version:1,exported:Date.now(),history:H})},
  async clearhist(){if(!confirm('Clear all quiz history?'))return;await db.clear('history');R=null;await load();render();pet('hm','History cleared.');toast('History cleared.')},
  async reset(){if(!confirm('Delete ALL questions, history and settings? This cannot be undone.'))return;await db.clear('questions');await db.clear('history');try{localStorage.removeItem('forma.prefs')}catch{}S=R=pending=null;await load();render();pet('pout','Everything is gone…');toast('All data reset.')}
};
main.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||!A[b.dataset.act])return;if(b.tagName==='A')e.preventDefault();guard(A[b.dataset.act])(b)});
main.addEventListener('submit',e=>e.preventDefault());
main.addEventListener('input',e=>{const el=e.target,g=el.dataset.in;if(!g)return;
  if(g==='F'){F[el.name]=el.value;if(el.name==='s'){F.t='';render()}else $('#list').innerHTML=listHtml()}
  else if(g==='P'){P[el.name]=el.name==='n'?+el.value:el.value;if(el.name==='s'){P.t='';render()}else if(el.name==='t')render()}
  else if(g==='pref'){if(el.name==='pet'){setPref('pet',el.value==='1');pet('happy','Hi again!')}else setPref(el.name,el.name==='n'?Math.max(1,+el.value||10):el.value)}});
$('#pet .sprite').addEventListener('click',()=>pet(say(['happy','shy','kiss','huh']),say(['Hi!','Ready to practice?','…I wasn\'t waiting for you or anything.','Good luck!']),3000));
main.addEventListener('change',guard(async e=>{if(e.target.id!=='bk'||!e.target.files[0])return;
  const d=JSON.parse(await readFile(e.target.files[0]));if(!d||!Array.isArray(d.questions||d.history))throw new Error('Not a Forma backup file');
  const qs=(d.questions||[]).filter(q=>q&&q.id&&q.subject&&q.topic&&q.setKey&&!validateQuestion(q).length),hs=(d.history||[]).filter(h=>h&&h.id&&Array.isArray(h.items));
  await db.putMany('questions',qs);await db.putMany('history',hs);await load();render();toast(`Restored ${qs.length} questions and ${hs.length} sessions.`)}));

function render(){let n=location.hash.slice(1);if(!V[n])n='overview';
  if(n==='practice'&&!S&&!R){const p=prefs();if(p.n)P.n=p.n;if(p.m)P.m=p.m}
  document.querySelectorAll('#nav a').forEach(a=>a.toggleAttribute('aria-current',a.hash==='#'+n)||a.removeAttribute('aria-current'));
  document.querySelectorAll('#nav a[aria-current]').forEach(a=>a.setAttribute('aria-current','page'));
  const f=document.activeElement&&document.activeElement.id;main.innerHTML=V[n]();if(f){const el=document.getElementById(f);if(el&&el.focus&&el.tagName==='SELECT')el.focus()}}
window.addEventListener('hashchange',()=>{if(location.hash!=='#practice')R=null;render();scrollTo(0,0)});
(async()=>{try{await load()}catch(e){main.innerHTML='<h1>Storage unavailable</h1><p class="err">IndexedDB could not be opened (private browsing?). '+esc(e.message||e)+'</p>';return}
  render();pet('idle');if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{})})();
