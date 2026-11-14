// Test hook: DOC_FAULT (dev builds only, see main.js app:info) names faults
// that make the app fail on purpose, so e2e tests can check error handling.
//   checkIn            appointmentRepo.checkIn throws
//   render:<page>      that page throws while rendering
let active = new Set();

export const setFaults = (list) => {
  active = new Set(String(list || '').split(',').map((s) => s.trim()).filter(Boolean));
};

// Run setup code (the demo seed checks patients in) with faults paused, so a
// fault only hits the action under test.
export const withoutFaults = async (fn) => {
  const saved = active;
  active = new Set();
  try { return await fn(); } finally { active = saved; }
};

export const fault = (name) => {
  if (active.has(name)) throw new Error(`Injected test fault: ${name}`);
};
