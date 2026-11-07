// Browser-local preference; no network, identity service, or cross-origin state.
const instances = new Map();
export function initTheme(storageKey) {
  if (instances.has(storageKey)) return instances.get(storageKey);
  const system = matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  let preference = 'system';
  try {
    const saved = localStorage.getItem(storageKey);
    if (['light', 'dark', 'system'].includes(saved)) preference = saved;
  } catch { /* Storage may be disabled. */ }
  function apply() {
    root.classList.add('tool-theme');
    root.classList.toggle('dark', preference === 'dark' || (preference === 'system' && system.matches));
  }
  apply();
  system.addEventListener('change', apply);
  const theme = {
    get preference() { return preference; },
    setPreference(value) {
      if (!['light', 'dark', 'system'].includes(value)) throw new Error('Invalid theme preference');
      preference = value;
      try { localStorage.setItem(storageKey, value); } catch { /* Keep in-memory preference. */ }
      apply();
    },
    dispose() {
      system.removeEventListener('change', apply);
      if (instances.get(storageKey) === theme) instances.delete(storageKey);
    },
  };
  instances.set(storageKey, theme);
  return theme;
}
