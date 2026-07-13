// Lightweight navigation requests from components that don't receive
// onNavigate as a prop (e.g. the topbar sync pill). app.jsx subscribes.
const listeners = new Set();
export const onNavigateRequest = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const requestNavigate = (page, params = null) => listeners.forEach((fn) => fn(page, params));
