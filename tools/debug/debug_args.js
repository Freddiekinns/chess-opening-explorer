const args = process.argv.slice(2);
const argv = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const nextArg = args[i + 1];
    const value = (nextArg !== undefined && !nextArg.startsWith('--')) ? nextArg : true;
    
    console.log(`Processing: ${args[i]}, next: ${nextArg}, value: "${value}"`);
    
    if (key === 'single') {
      argv.single = value;
    }
    
    if (value !== true) i++;
  }
}

console.log('Final argv:', argv);
console.log('argv.single:', argv.single);
console.log('typeof argv.single:', typeof argv.single);
console.log('argv.single === "":', argv.single === '');
if (typeof argv.single === 'string') {
  console.log('argv.single.trim() === "":', argv.single.trim() === '');
}

// Test validation logic
if ((argv.single === undefined || argv.single === true) && !argv.batch) {
  console.log('Would show: Must specify either --single or --batch');
} else if (argv.single && (typeof argv.single !== 'string' || argv.single.trim() === '')) {
  console.log('Would show: Opening name cannot be empty');
} else {
  console.log('Validation passed');
}
