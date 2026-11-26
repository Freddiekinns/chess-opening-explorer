// Throwaway: inject line.json (from line.js plus names and the step beyond the end) into template.html.
const fs = require('fs');
process.stdout.write(fs.readFileSync(__dirname + '/template.html', 'utf8').replace('/*LINE*/[]', fs.readFileSync(__dirname + '/line.json', 'utf8')).replace('/*PUZZLES*/[]', fs.readFileSync(__dirname + '/puzzles.json', 'utf8')));
