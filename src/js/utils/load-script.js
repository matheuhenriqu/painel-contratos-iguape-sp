const loadedScripts = new Map();

export function loadVendorScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  if (loadedScripts.has(src)) return loadedScripts.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), {
        once: true,
      });
      existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}.`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}.`));
    document.head.append(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}
