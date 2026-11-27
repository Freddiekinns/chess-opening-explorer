const S='/tmp/claude-0/-home-user-chess-opening-explorer/783681b7-050b-5ce6-a606-7da4607df886/scratchpad';
const {Chess}=require(S+'/npm/node_modules/chess.js');
const P=require('/home/user/chess-opening-explorer/packages/web/public/lab/play-through-puzzles.json');
const pages=require(S+'/pages.json');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd=mulberry32(7);
const seen=new Set();
let pool=pages.filter(x=>/:[^,]*,/.test(x.name)&&P[x.fen]&&!seen.has(x.fen)&&seen.add(x.fen));
pool=pool.slice();
const pick=[];
while(pick.length<12){const i=Math.floor(rnd()*pool.length);pick.push(pool.splice(i,1)[0]);}
function side(name){
 const w=name.replace(/[^A-Za-z' -]/g,' ').split(/\s+/).filter(Boolean);
 const B=['defense','defence','declined','accepted','countergambit','counterattack'],W=['gambit','attack','system','opening'];
 for(let i=w.length-1;i>=0;i--){const l=w[i].toLowerCase();if(B.includes(l))return 'black';if(W.includes(l))return 'white';}
 return 'white';}
const board=f=>f.split(' ')[0].split('/').map(r=>r.replace(/\d/g,n=>'.'.repeat(n))).join('\n');
for(const p of pick){
 const s=side(p.name);const c=new Chess();for(const m of p.moves.split(' '))c.move(m);
 console.log('\n### ',p.name,'|',p.moves,'| side',s,'| pool n=',P[p.fen][s].length);
 console.log(board(c.fen()).replace(/\n/g,'\n   '));
 for(const z of P[p.fen][s]){const q=new Chess(z.fen);const san=[];for(const u of z.moves){const m=q.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});san.push(m.san);}
  console.log(' ',z.id,z.rating,z.fen.split(' ').slice(0,2).join(' '),'|',san.join(' '));
  console.log(board(z.fen).replace(/\n/g,'\n     '));}
}
