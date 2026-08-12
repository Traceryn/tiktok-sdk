const { execSync } = require('child_process');
const { readdirSync } = require('fs');
const { join } = require('path');

const examples = readdirSync(__dirname).filter(f => f.endsWith('.cjs') && f !== 'index.cjs').sort();

let passed = 0;
let failed = 0;

for (const f of examples) {
  try {
    execSync(`node --check "${join(__dirname, f)}"`, { stdio: 'pipe', timeout: 10000 });
    console.log(`  PASS  ${f}`);
    passed++;
  } catch (e) {
    const msg = e.stderr?.toString()?.split('\n')?.filter(l => l.trim())[0] || e.message;
    console.log(`  FAIL  ${f} — ${msg}`);
    failed++;
  }
}

console.log(`\n${passed + failed} total — ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
