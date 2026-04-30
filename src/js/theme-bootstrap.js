(function () {
  const storageKey = 'painel.theme';
  const validThemes = new Set(['auto', 'light', 'dark', 'hc']);
  const themeColors = {
    light: '#16664f',
    dark: '#0e1414',
    hc: '#000000',
  };

  function getStoredTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return validThemes.has(value) ? value : 'auto';
    } catch {
      return 'auto';
    }
  }

  function getResolvedTheme(theme) {
    if (theme === 'hc') return 'hc';
    if (theme === 'dark' || theme === 'light') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const theme = getStoredTheme();
  const resolvedTheme = getResolvedTheme(theme);
  const root = document.documentElement;
  root.dataset.themeMode = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', themeColors[resolvedTheme]);
})();
