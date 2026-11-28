const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const ps=require('/home/user/chess-opening-explorer/packages/api/src/services/position-stats-service');
const B=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-branches.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
const eco={}; for(const f of fs.readdirSync('/home/user/chess-opening-explorer/api/data/eco')) if(f.endsWith('.json')) Object.assign(eco, JSON.parse(fs.readFileSync('/home/user/chess-opening-explorer/api/data/eco/'+f)));
const k4=f=>f.split(' ').slice(0,4).join(' '); const nameBy={}; for(const [f,o] of Object.entries(eco)) nameBy[k4(f)]=o.name;
const keys=Object.keys(B); const pick=process.argv[2]==='all'?keys:process.argv.slice(2).length?keys.filter(f=>(byFen[f]?.name||'').match(new RegExp(process.argv[2]))):keys;
for(const f of pick){ const p=byFen[f]; const mv=p.moves.split(' '); const it=B[f];
  for(const x of it.items){ const g=new Chess(); for(let i=0;i<x.ply;i++) g.move(mv[i]); const pre=g.fen(); const bb=ps.bandsFor(pre);
    const sh=b=>{const r=bb?.[b]; if(!r) return '-'; const m=r.moves.find(m=>m.san===x.dev); return m?Math.round(100*m.games/r.totalGames):0;};
    g.move(x.dev); const dfen=g.fen(); const rb=ps.bandsFor(dfen); const rs=b=>{const r=rb?.[b]; if(!r) return '-'; const t=r.moves.slice().sort((a,c)=>c.games-a.games); return t.slice(0,2).map(m=>m.san+Math.round(100*m.games/r.totalGames)).join('/');};
    const after=new Chess(dfen); after.move(x.reply);
    console.log(`${p.name} [${it.side}] | ${mv.slice(0,x.ply).join(' ')} *${x.dev}* (line ${mv[x.ply]}) dev%1400=${Math.round(x.devShare*100)} u14=${sh('u1400')} 18=${sh('1800')} 22=${sh('2200')} | reply ${x.reply} ${Math.round(x.replyShare*100)}% common=${x.common} ok#${x.ok.length} | reply@u14 ${rs('u1400')} @18 ${rs('1800')} | nameAfterDev=${nameBy[k4(dfen)]||'-'} afterReply=${nameBy[k4(after.fen())]||'-'}`);
  }}
