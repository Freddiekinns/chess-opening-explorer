const {spawn}=require('child_process'); const fs=require('fs'); const S=process.env.S; const {Chess}=require(S+'/npm/node_modules/chess.js');
const D=JSON.parse(fs.readFileSync(S+'/critic/devfens.json')); const uniq=[...new Map(D.map(x=>[x.fen,x])).values()];
const sf=spawn('/usr/games/stockfish'); let buf='',wait=null;
sf.stdout.on('data',d=>{buf+=d; if(wait&&buf.includes(wait.tok)){const b=buf;buf='';const w=wait;wait=null;w.res(b);}});
const ask=(c,t)=>new Promise(r=>{wait={tok:t,res:r};sf.stdin.write(c+'\n');});
(async()=>{await ask('uci','uciok'); sf.stdin.write('setoption name Threads value 4\nsetoption name MultiPV value 2\n'); await ask('isready','readyok');
 let bad=[]; for(const x of uniq){ const o=await ask(`position fen ${x.fen}\ngo depth 16`,'bestmove'); const bm=o.match(/bestmove (\S+)/)[1];
  const pv={}; for(const l of o.split('\n')){const m=l.match(/ depth 16 .*multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/); if(m) pv[m[1]]=[m[2]==='cp'?+m[3]:(+m[3]>0?9999:-9999),m[4]];}
  const g=new Chess(x.fen); const s=g.move({from:bm.slice(0,2),to:bm.slice(2,4),promotion:bm[4]}).san;
  const gap=pv[1]&&pv[2]?pv[1][0]-pv[2][0]:null;
  if(s!==x.reply && !x.common.includes(s)) bad.push([x.page,x.fen.split(' ').slice(0,2).join(' '),'reply',x.reply,Math.round(x.share*100),'best',s,'gap',gap,'inOk',x.ok.includes(s)]); }
 console.log(uniq.length,'positions; engine best rejected:',bad.length); console.log(bad.map(b=>b.join(' ')).join('\n')); sf.kill();})();
