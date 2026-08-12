const nodeVersion = process.versions.node;
const major = Number(nodeVersion.split('.')[0]);
if (major < 18) {
  console.error(`❌ Node.js >= 18 required (found ${nodeVersion})`);
  process.exit(1);
}
console.log(`✓ Node.js ${nodeVersion}`);
