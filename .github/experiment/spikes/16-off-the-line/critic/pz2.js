const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const P=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-puzzles.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
const side=(n)=>{let s='white';for(const m of n.matchAll(/(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g)) s=m[1]?'black':'white';return s;};
const re=new RegExp(process.argv[2]);
const board=f=>{const q=new Chess(f);const o={};for(const r of q.board())for(const c of r)if(c)o[c.square]=(c.color==='w'?c.type.toUpperCase():c.type);return o;};
for(const [f,v] of Object.entries(P)){ const p=byFen[f]; if(!re.test(p.name)) continue; const sd=side(p.name); const e=board(f);
 console.log(`== ${p.name} [${sd}] ${p.moves}`);
 for(const z of v[sd]||[]){ const b=board(z.fen); const gone=Object.keys(e).filter(s=>e[s]!==b[s]).map(s=>e[s]+s); const extra=Object.keys(b).filter(s=>e[s]!==b[s]).map(s=>b[s]+s);
  console.log(`  ${z.id} r${z.rating} +${+z.fen.split(' ')[5]-+f.split(' ')[5]} first=${z.moves[0]} gone[${gone}] new[${extra}]`);} }
