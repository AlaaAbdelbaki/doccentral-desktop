// Make sure the Electron binary is present, then build the renderer bundle.
// Electron 35+ downloads its binary lazily on first launch; doing it here
// (a no-op once installed) fails loudly up front instead of hanging inside
// the first test while a ~115 MB download runs.
const { execSync } = require('child_process');
const path = require('path');

module.exports = () => {
  const cwd = path.join(__dirname, '..', '..');
  execSync('npx install-electron', { cwd, stdio: 'inherit' });
  execSync('npm run build', { cwd, stdio: 'inherit' });
};
