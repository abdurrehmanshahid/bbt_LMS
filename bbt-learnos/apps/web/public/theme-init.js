(() => {
  try {
    const stored = window.localStorage.getItem('bbt-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {
    document.documentElement.classList.add('dark');
  }
})();
