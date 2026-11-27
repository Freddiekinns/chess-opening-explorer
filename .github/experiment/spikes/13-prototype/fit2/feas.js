const S='/tmp/claude-0/-home-user-chess-opening-explorer/783681b7-050b-5ce6-a606-7da4607df886/scratchpad';
const {Chess}=require(S+'/npm/node_modules/chess.js');
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/sample.js','utf8');
const P=require('/home/user/chess-opening-explorer/packages/web/public/lab/play-through-puzzles.json');
const pages=require(S+'/pages.json');
function parse(fen){const b={};fen.split(' ')[0].split('/').forEach((r,i)=>{let f=0;for(const ch of r){if(/\d/.test(ch))f+=+ch;else{b[String.fromCharCode(97+f)+(8-i)]=ch;f++}}});return b}
function pawns(b,w){return Object.entries(b).filter(([s,p])=>p===(w?'P':'p')).map(([s])=>[s.charCodeAt(0)-97,+s[1]])}
function cost(L,Q,w){ // min file shifts to map puzzle pawns to line pawns, or null
 if(Q.length>L.length)return null;const n=Q.length,m=L.length;const memo=new Map();
 function go(i,mask){if(i===n)return 0;const k=i*512+mask;if(memo.has(k))return memo.get(k);let best=Infinity;
  for(let j=0;j<m;j++){if(mask>>j&1)continue;const [lf,lr]=L[j],[qf,qr]=Q[i];const adv=w?qr-lr:lr-qr;const sh=Math.abs(lf-qf);if(adv<0||sh>adv)continue;
   best=Math.min(best,sh+go(i+1,mask|1<<j));}
  memo.set(k,best);return best;}
 const r=go(0,0);return r===Infinity?null:r;}
const cnt=b=>{const c={};for(const p of Object.values(b))c[p]=(c[p]||0)+1;return c};
module.exports={parse,pawns,cost,cnt};
if(require.main===module){
 const out=fs.readFileSync(__dirname+'/out.txt','utf8');
 // rebuild picks via sample's logic by parsing '###' lines
 const names=[...out.matchAll(/###  (.*?) \| (.*?) \| side (\w+)/g)];
 for(const [,name,moves,side] of names){const p=pages.find(x=>x.name===name&&x.moves===moves);const c=new Chess();for(const m of moves.split(' '))c.move(m);
  const LB=parse(c.fen());const lc=cnt(LB);console.log('\n##',name,side,'plies',moves.split(' ').length);
  for(const z of P[p.fen][side]){const QB=parse(z.fen);const qc=cnt(QB);
   const fm=+z.fen.split(' ')[5];const tm=z.fen.split(' ')[1];const ply=(fm-1)*2+(tm==='b'?1:0);
   const wc=cost(pawns(LB,1),pawns(QB,1),1),bc=cost(pawns(LB,0),pawns(QB,0),0);
   const diff=[];for(const k of new Set([...Object.keys(lc),...Object.keys(qc)])){const d=(qc[k]||0)-(lc[k]||0);if(d)diff.push(k+(d>0?'+':'')+d)}
   console.log(z.id,'ply',ply,'(line',moves.split(' ').length,') Wpawn shifts',wc,'Bpawn shifts',bc,'matdiff',diff.join(' '));}}
}
