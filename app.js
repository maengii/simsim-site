'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ball=n=>`<span class="ball b${Math.ceil(n/10)}">${n}</span>`;
const balls=arr=>`<div class="balls">${arr.map(ball).join('')}</div>`;
const when=s=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'});
function gamesHTML(r){return r.games.map((g,i)=>{const m=r.result?.matches?.[i];const wins=r.result?.numbers||[];const bonus=r.result?.bonus;const display=g.map(n=>{const hits=g.filter(v=>wins.includes(v)).length;const isSecond=hits===5&&g.includes(bonus);const cls=wins.includes(n)?'matched-ball':isSecond&&n===bonus?'bonus-ball':'unmatched-ball';return r.result?`<span class="ball b${Math.ceil(n/10)} ${cls}" title="${wins.includes(n)?'당첨번호 일치':n===bonus?'보너스 번호':'불일치'}">${n}</span>`:ball(n)}).join('');const bonusHit=r.result&&g.filter(v=>wins.includes(v)).length===5&&g.includes(bonus);const label=m?(m.rank?`${m.rank}등 · ${m.hits}개 일치`:`${m.hits}개 일치${bonusHit?' + 보너스':''}`):'결과 대기';return `<div class="game"><span class="game-label">GAME ${String(i+1).padStart(2,'0')}</span><div class="balls">${display}</div><span class="game-right ${m?'hit':'waiting'}">${label}</span></div>`}).join('')}
function resultHTML(r){if(!r.result)return `<div class="muted">추첨 결과 발표 후 자동 대조됩니다. 자동 조회에 실패하면 결과 대기 상태를 유지합니다.</div>`;return `<div class="winning"><b>공식 당첨번호</b><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${balls(r.result.numbers)}<span class="muted">보너스</span>${ball(r.result.bonus)}</div><div class="muted" style="margin-top:12px">초록색 이중 테두리와 ✓: 당첨번호 일치 · 금색 테두리와 B: 2등 조건의 보너스 · 회색: 불일치<br>결과 반영 ${esc(when(r.result.verified_at))} · <a href="${esc(r.result.source.startsWith('https://www.dhlottery.co.kr/')?r.result.source:'https://www.dhlottery.co.kr/')}" target="_blank" rel="noopener" style="text-decoration:underline">공식 결과 확인</a></div></div>`}
let allRounds=[],activeFilter=null;
const completed=()=>allRounds.filter(r=>r.result);
const maxHits=()=>Math.max(0,...completed().flatMap(r=>r.result.matches.map(m=>m.hits)));
function stats(rounds){
 const done=rounds.filter(r=>r.result),matches=done.flatMap(r=>r.result.matches),best=maxHits();
 const items=[['all','게시 회차',rounds.length+'회','공개한 모든 회차'],['done','대조 완료',done.length+'회','당첨 결과 확인 완료'],['best','최고 일치',best+'개','최고 기록을 달성한 게임'],['three','3개 이상 일치',matches.filter(m=>m.hits>=3).length+'게임','3개 이상 맞힌 게임']];
 $('stat-grid').innerHTML=items.map(([key,l,v,desc])=>`<button type="button" class="stat stat-button ${activeFilter===key?'selected':''}" data-filter="${key}" aria-pressed="${activeFilter===key}" aria-label="${l} ${v}, ${desc}"><b>${v}</b><span>${l}</span><small>기록 보기 ↗</small></button>`).join('');
 $('stat-grid').querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
   const key=btn.dataset.filter;activeFilter=activeFilter===key?null:key;
   stats(allRounds);renderHistory();
   $('history').scrollIntoView({behavior:'smooth',block:'start'});
 }));
}
function renderHistory(){
 const best=maxHits();
 let list=activeFilter==='all'?allRounds:activeFilter==='done'?completed():activeFilter==='best'?completed().filter(r=>best>0&&r.result.matches.some(m=>m.hits===best)):activeFilter==='three'?completed().filter(r=>r.result.matches.some(m=>m.hits>=3)):allRounds.slice(1);
 const labels={all:'전체 게시 기록',done:'대조 완료 기록',best:'최고 일치 기록',three:'3개 이상 일치 기록'};
 $('history-filter').textContent=activeFilter?labels[activeFilter]:'게시 시각 및 검증 출처 포함';
 $('history-clear').hidden=!activeFilter;
 $('history-list').innerHTML=list.map(x=>{
  const indices=activeFilter==='best'?x.result.matches.map((m,i)=>m.hits===best?i:-1).filter(i=>i>=0):activeFilter==='three'?x.result.matches.map((m,i)=>m.hits>=3?i:-1).filter(i=>i>=0):null;
  const shown=indices?{...x,games:indices.map(i=>x.games[i]),result:{...x.result,matches:indices.map(i=>x.result.matches[i])}}:x;
  const games=indices?indices.map(i=>{const one={...x,games:[x.games[i]],result:{...x.result,matches:[x.result.matches[i]]}};return gamesHTML(one).replace('GAME 01',`GAME ${String(i+1).padStart(2,'0')}`)}).join(''):gamesHTML(shown);
  return `<details class="archive" ${activeFilter?'open':''}><summary><strong>${x.round}회 · ${esc(x.draw_date)}</strong><span class="muted">${x.result?'대조 완료':'결과 대기'}　⌄</span></summary><div class="archive-body"><p class="muted">최초 게시 ${esc(when(x.published_at))}</p>${games}${resultHTML(x)}</div></details>`;
 }).join('')||'<div class="skeleton">해당 조건에 맞는 기록이 아직 없습니다.</div>';
}
async function main(){try{const res=await fetch('./data/rounds.json?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('데이터 요청 실패');const data=await res.json();const rounds=(data.rounds||[]).slice().sort((a,b)=>Number(b.round)-Number(a.round));if(!rounds.length){$('current').innerHTML='<div class="skeleton">아직 게시된 번호가 없습니다.</div>';stats([]);return}const r=rounds[0];$('week-status').textContent=r.result?'추첨 완료':'결과 대기';$('current').innerHTML=`<article class="card"><div class="round-head"><div><h3>${r.round}회</h3><div class="muted">추첨일 ${esc(r.draw_date)} · 게시 ${esc(when(r.published_at))}</div></div><span class="pill">5 GAMES</span></div>${gamesHTML(r)}${resultHTML(r)}</article>`;allRounds=rounds;stats(rounds);renderHistory()}catch(err){$('current').innerHTML=`<div class="skeleton">데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.<br><small>${esc(err.message)}</small></div>`;}}
$('history-clear').addEventListener('click',()=>{activeFilter=null;stats(allRounds);renderHistory()});
main();
