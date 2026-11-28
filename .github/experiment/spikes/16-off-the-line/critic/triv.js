const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const B=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-branches.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
let n=0,recap=0,castle=0,ok1=0,s90=0,anyT=0,allT=0,pagesN=0; const devFens=[];
for(const [f,v] of Object.entries(B)){ pagesN++; const mv=byFen[f].moves.split(' '); let t=0;
 for(const x of v.items){ n++; const g=new Chess(); for(let i=0;i<x.ply;i++) g.move(mv[i]); const d=g.move(x.dev); const m=g.move(x.reply);
  const rc=!!m.captured && m.to===d.to; const tr = rc || m.san.startsWith('O-O') || x.ok.length===1;
  if(rc)recap++; if(m.san.startsWith('O-O'))castle++; if(x.ok.length===1)ok1++; if(x.replyShare>=0.9)s90++; if(tr)t++;
  g.undo(); devFens.push({page:byFen[f].name,fen:g.fen(),reply:x.reply,common:x.common,ok:x.ok,share:x.replyShare});}
 if(t) anyT++; if(t===v.items.length) allT++; }
console.log({pagesN,n,recap,castle,ok1,s90,pagesAnyTrivial:anyT,pagesAllTrivial:allT});
fs.writeFileSync(S+'/critic/devfens.json',JSON.stringify(devFens));
