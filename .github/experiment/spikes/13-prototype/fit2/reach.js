const S='/tmp/claude-0/-home-user-chess-opening-explorer/783681b7-050b-5ce6-a606-7da4607df886/scratchpad';
const {Chess}=require(S+'/npm/node_modules/chess.js');
const fs=require('fs');
const {parse}=require('./feas.js');
const P=require('/home/user/chess-opening-explorer/packages/web/public/lab/play-through-puzzles.json');
const pages=require(S+'/pages.json');
// need function reuse (copy of lb.js's lower without its main)
const src=fs.readFileSync(__dirname+'/lb.js','utf8').split("const out=fs.readFileSync")[0];
const m={exports:{}};new Function('require','module','__dirname',src)(require,m,__dirname);
const {lower}=m.exports;
function need(B,QB,white){const r=lower(B,QB,white);let t=r.tot;
 // castling adjustment
 const kc=white?'K':'k';const ks=Object.entries(B).find(([s,p])=>p===kc),qs=Object.entries(QB).find(([s,p])=>p===kc);
 if(ks&&qs&&ks[0][1]===qs[0][1]&&Math.abs(ks[0].charCodeAt(0)-qs[0].charCodeAt(0))===2)t-=2;
 const bad=Object.values(r.detail).includes('X');return bad?999:t;}
function units(B,white){let n=0;for(const p of Object.values(B))if(p!=='K'&&p!=='k'&&(p===p.toUpperCase())===white)n++;return n}
function placement(f){return f.split(' ')[0]}
function search(startFen,target,R){
 const tB=parse(target),tp=placement(target),tstm=target.split(' ')[1];
 let nodes=0;const failed=new Set();const CAP=200000;
 const tw=units(tB,true),tb=units(tB,false);
 function dfs(g,R){
  if(++nodes>CAP)throw new Error('cap');
  const f=g.fen();const stm=f.split(' ')[1];
  if(R===0)return placement(f)===tp&&stm===tstm?[]:null;
  const key=placement(f)+stm+R;if(failed.has(key))return null;
  const mv=g.moves({verbose:true});const cand=[];
  const wRemAfter=(side)=>0;
  for(const x of mv){g.move(x);const nf=g.fen();const B=parse(nf);
   const nextStm=nf.split(' ')[1];const R2=R-1;
   // moves left per side after this move: next to move is nextStm
   const wLeft=Math.ceil((R2+(nextStm==='w'?0:-0))/1);
   let wl,bl;if(nextStm==='w'){wl=Math.ceil(R2/2);bl=Math.floor(R2/2)}else{bl=Math.ceil(R2/2);wl=Math.floor(R2/2)}
   const nw=need(B,parse(target),true),nb=need(B,parse(target),false);
   const ok=nw<=wl&&nb<=bl&&units(B,true)>=tw&&units(B,false)>=tb&&(units(B,true)-tw)<=bl&&(units(B,false)-tb)<=wl;
   if(ok)cand.push([nw+nb,nf,x.san]);
   g.undo();}
  cand.sort((a,b)=>a[0]-b[0]);
  for(const [,nf,san] of cand){const g2=new Chess(nf);const r=dfs(g2,R-1);if(r)return [san,...r]}
  failed.add(key);return null;}
 const g=new Chess(startFen);try{const r=dfs(g,R);return {r,nodes}}catch(e){return {r:'cap',nodes}}}
module.exports={search};
if(require.main===module){
 const out=fs.readFileSync(__dirname+'/out.txt','utf8');
 const only=process.argv[2];
 for(const [,name,moves,side] of [...out.matchAll(/###  (.*?) \| (.*?) \| side (\w+)/g)]){
  const p=pages.find(x=>x.name===name&&x.moves===moves);const c=new Chess();for(const mm of moves.split(' '))c.move(mm);
  const n=moves.split(' ').length;console.log('\n##',name,side);
  for(const z of P[p.fen][side]){if(only&&z.id!==only)continue;const [pl,tm,,,,fm]=z.fen.split(' ');const ply=(+fm-1)*2+(tm==='b'?1:0);const R=ply-n;
   const t0=Date.now();const res=search(c.fen(),z.fen,R);
   console.log(z.id,'R',R,Array.isArray(res.r)?'REACHABLE '+res.r.join(' '):res.r===null?'UNREACHABLE':'CAP','nodes',res.nodes,(Date.now()-t0)+'ms');}}}
