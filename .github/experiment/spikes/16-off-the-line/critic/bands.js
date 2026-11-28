const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const ps=require('/home/user/chess-opening-explorer/packages/api/src/services/position-stats-service');
const B=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-branches.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
const res={}; let check=0, mism=0;
for(const [f,v] of Object.entries(B)){ const mv=byFen[f].moves.split(' ');
 for(const x of v.items){ const g=new Chess(); for(let i=0;i<x.ply;i++) g.move(mv[i]); const pre=ps.bandsFor(g.fen()); g.move(x.dev); const post=ps.bandsFor(g.fen());
  // verify 1400 numbers
  const r=pre['1400']; const m=r.moves.find(m=>m.san===x.dev); check++; if(Math.abs(m.games/r.totalGames-x.devShare)>0.006) mism++;
  for(const b of ['all','u1400','1800','2200']){ res[b]=res[b]||{n:0,devUnder10:0,replyNotTop:0,devOff5:0};
   const R=pre[b], P=post[b]; res[b].n++; const dm=R&&R.moves.find(m=>m.san===x.dev); const ds=dm?dm.games/R.totalGames:0;
   if(ds<0.1) res[b].devUnder10++; if(Math.abs(ds-x.devShare)>=0.05) res[b].devOff5++;
   const top=P&&P.moves.slice().sort((a,c)=>c.games-a.games)[0]; if(!top||top.san!==x.reply) res[b].replyNotTop++; }}}
console.log({check,mism}); console.log(res);
