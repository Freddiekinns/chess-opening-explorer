const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const P=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-puzzles.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
const side=(n)=>{let s='white';for(const m of n.matchAll(/(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g)) s=m[1]?'black':'white';return s;};
let tot=0,lastMiss=0,last2Miss=0,mvAfter=[]; const ex=[]; let nopage=0;
for(const [f,v] of Object.entries(P)){ const p=byFen[f]; if(!p){nopage++;continue;} const mv=p.moves.split(' '); const g=new Chess(); const h=[]; for(const m of mv) h.push(g.move(m));
 const endFull=+f.split(' ')[5];
 for(const sd of ['white','black']) for(const z of (v[sd]||[])){ tot++; const q=new Chess(z.fen); 
  const miss=(k)=>{const m=h[h.length-k]; if(!m) return false; const pc=q.get(m.to); return !(pc&&pc.type===m.piece&&pc.color===m.color);};
  const a=miss(1), b=miss(2); if(a) lastMiss++; if(a||b) last2Miss++; mvAfter.push(+z.fen.split(' ')[5]-endFull);
  if((a||b)&&ex.length<400) ex.push(`${p.name} [learner ${side(p.name)}; puzzle ${sd}] last=${h[h.length-1].san}${a?'(gone)':''} prev=${h[h.length-2]?.san}${b?'(gone)':''} ${z.id} ${z.fen}`); }}
mvAfter.sort((a,b)=>a-b);
console.log({tot,nopage,lastMoveGone:lastMiss,last2Gone:last2Miss,movesAfterMedian:mvAfter[mvAfter.length>>1],neg:mvAfter.filter(x=>x<0).length,p90:mvAfter[Math.floor(mvAfter.length*0.9)]});
fs.writeFileSync(S+'/critic/pz-ex.txt',ex.join('\n'));
