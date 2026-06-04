import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = {
  // ── Modes sombres ──────────────────────────────────────────────────
  'dark-standard': {
    label: 'Sombre Standard',
    group: 'dark',
    groupLabel: 'Mode Sombre',
    description: 'Noir profond avec nuances bleutées',
    preview: ['#111118', '#1c1c24', '#7c3aed'],
  },
  'dark-anthracite': {
    label: 'Sombre Anthracite',
    group: 'dark',
    groupLabel: 'Mode Sombre',
    description: 'Gris anthracite avec teintes chaudes',
    preview: ['#18181b', '#27272a', '#a855f7'],
  },
  // ── Modes clairs ───────────────────────────────────────────────────
  'light-cream': {
    label: 'Clair Crème',
    group: 'light',
    groupLabel: 'Mode Clair',
    description: 'Blanc crème chaleureux et doux',
    preview: ['#faf7f2', '#f0ebe2', '#7c3aed'],
  },
  'light-offwhite': {
    label: 'Clair Blanc Cassé',
    group: 'light',
    groupLabel: 'Mode Clair',
    description: 'Blanc cassé épuré et minimaliste',
    preview: ['#f5f5f0', '#ebebeb', '#6d28d9'],
  },
};

const ThemeContext = createContext({ theme: 'dark-standard', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    localStorage.getItem('harchive-theme') || 'dark-standard'
  );

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('harchive-theme', t);
  };

  useEffect(() => {
    const html = document.documentElement;
    // Remove all theme classes
    Object.keys(THEMES).forEach(t => html.classList.remove(`theme-${t}`));
    html.setAttribute('data-theme', theme);
    html.classList.add(`theme-${theme}`);
    // Toggle .dark for Tailwind dark mode
    if (THEMES[theme]?.group === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
