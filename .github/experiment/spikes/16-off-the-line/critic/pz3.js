const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const P=JSON.parse(fs.readFileSync(S+'/wt/packages/web/public/lab/play-through-puzzles.json'));
const pages=JSON.parse(fs.readFileSync(S+'/pages-all.json')); const byFen={}; for(const p of pages) byFen[p.fen]=p;
const side=(n)=>{let s='white';for(const m of n.matchAll(/(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g)) s=m[1]?'black':'white';return s;};
let tot=0,bad=0,badPages=new Set(),pagesL=new Set(); const ex=[];
for(const [f,v] of Object.entries(P)){ const p=byFen[f]; const sd=side(p.name); const e=new Chess(f); 
 for(const z of v[sd]||[]){ tot++; pagesL.add(f); const q=new Chess(z.fen); const why=[];
  for(const file of 'abcdefgh'){ for(const [r,c] of [['2','w'],['7','b']]){ const s=file+r; const a=e.get(s), b=q.get(s);
    const hasE=a&&a.type==='p'&&a.color===c, hasQ=b&&b.type==='p'&&b.color===c; if(!hasE&&hasQ) why.push(s);} }
  // castling rights: line end lacks right that puzzle has
  const cr=x=>x.split(' ')[2]; for(const ch of cr(z.fen)) if(ch!=='-'&&!cr(f).includes(ch)) why.push('castle'+ch);
  if(why.length){bad++; badPages.add(f); ex.push(`${p.name} [${sd}] ${z.id} pawnBack/rights:${why} ${z.fen}`);} }}
console.log({learnerSidePuzzles:tot,unreachable:bad,pages:pagesL.size,pagesWithOne:badPages.size}); console.log(ex.join('\n'));
