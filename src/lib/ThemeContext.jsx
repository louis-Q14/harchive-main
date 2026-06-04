import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = {
  'dark-standard': {
    label: 'Sombre Standard',
    group: 'dark',
    groupLabel: 'Mode Sombre',
    description: 'Noir profond avec nuances bleutées',
    preview: ['#111118', '#1c1c24', '#7c3aed'],
    vars: {
      '--ha-bg': '#111118',
      '--ha-surface': '#1c1c24',
      '--ha-surface2': '#2d2d2d',
      '--ha-surface3': '#3d3d3d',
      '--ha-border': 'rgba(255,255,255,0.07)',
      '--ha-text': '#ffffff',
      '--ha-text-muted': '#9ca3af',
      '--ha-text-faint': '#6b7280',
      '--ha-sidebar-bg': '#0e0e14',
      '--ha-accent': '#7c3aed',
      '--ha-hover': 'rgba(255,255,255,0.06)',
    },
  },
  'dark-anthracite': {
    label: 'Sombre Anthracite',
    group: 'dark',
    groupLabel: 'Mode Sombre',
    description: 'Gris anthracite avec teintes chaudes',
    preview: ['#18181b', '#27272a', '#a855f7'],
    vars: {
      '--ha-bg': '#18181b',
      '--ha-surface': '#27272a',
      '--ha-surface2': '#3f3f46',
      '--ha-surface3': '#52525b',
      '--ha-border': 'rgba(255,255,255,0.09)',
      '--ha-text': '#fafafa',
      '--ha-text-muted': '#a1a1aa',
      '--ha-text-faint': '#71717a',
      '--ha-sidebar-bg': '#111113',
      '--ha-accent': '#a855f7',
      '--ha-hover': 'rgba(255,255,255,0.07)',
    },
  },
  'light-cream': {
    label: 'Clair Crème',
    group: 'light',
    groupLabel: 'Mode Clair',
    description: 'Blanc crème chaleureux et doux',
    preview: ['#faf7f2', '#f0ebe2', '#7c3aed'],
    vars: {
      '--ha-bg': '#faf7f2',
      '--ha-surface': '#f0ebe2',
      '--ha-surface2': '#e8e1d6',
      '--ha-surface3': '#ddd5c8',
      '--ha-border': 'rgba(0,0,0,0.08)',
      '--ha-text': '#1c1917',
      '--ha-text-muted': '#78716c',
      '--ha-text-faint': '#a8a29e',
      '--ha-sidebar-bg': '#ede8e0',
      '--ha-accent': '#7c3aed',
      '--ha-hover': 'rgba(0,0,0,0.04)',
    },
  },
  'light-offwhite': {
    label: 'Clair Blanc Cassé',
    group: 'light',
    groupLabel: 'Mode Clair',
    description: 'Blanc cassé épuré et minimaliste',
    preview: ['#f5f5f0', '#ebebeb', '#6d28d9'],
    vars: {
      '--ha-bg': '#f5f5f0',
      '--ha-surface': '#ebebeb',
      '--ha-surface2': '#e0e0da',
      '--ha-surface3': '#d4d4ce',
      '--ha-border': 'rgba(0,0,0,0.07)',
      '--ha-text': '#111111',
      '--ha-text-muted': '#6b7280',
      '--ha-text-faint': '#9ca3af',
      '--ha-sidebar-bg': '#eeeeea',
      '--ha-accent': '#6d28d9',
      '--ha-hover': 'rgba(0,0,0,0.04)',
    },
  },
};

const ThemeContext = createContext({ theme: 'dark-standard', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    localStorage.getItem('harchive-theme') || 'dark-standard'
  );

  const applyTheme = (t) => {
    const def = THEMES[t] || THEMES['dark-standard'];
    const root = document.documentElement;

    // Remove old theme classes
    Object.keys(THEMES).forEach(k => root.classList.remove(`theme-${k}`));
    root.setAttribute('data-theme', t);
    root.classList.add(`theme-${t}`);

    // Toggle Tailwind dark mode
    if (def.group === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Inject CSS variables directly on :root via JS (overrides static CSS)
    Object.entries(def.vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    // Apply background & color directly to body
    document.body.style.backgroundColor = def.vars['--ha-bg'];
    document.body.style.color = def.vars['--ha-text'];
  };

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('harchive-theme', t);
    applyTheme(t);
  };

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeDef: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
