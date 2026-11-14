import { createRoot } from 'react-dom/client';
import { App } from './app.jsx';
import { setFaults } from './lib/faults.js';

// Test faults (dev builds only) must be known before the first render.
window.dc.app.info()
  .then((i) => setFaults(i.faults))
  .catch(() => {})
  .finally(() => createRoot(document.getElementById('root')).render(<App/>));
