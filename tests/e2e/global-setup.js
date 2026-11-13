// Build the renderer bundle once before the suite runs.
const { execSync } = require('child_process');
const path = require('path');

module.exports = () => {
  execSync('npm run build', { cwd: path.join(__dirname, '..', '..'), stdio: 'inherit' });
};
