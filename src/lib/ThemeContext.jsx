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
    description: 'Fond blanc, texte noir',
    preview: ['#ffffff', '#f3f4f6', '#7c3aed'],
    vars: {
      '--ha-bg': '#ffffff',
      '--ha-surface': '#ffffff',
      '--ha-surface2': '#f3f4f6',
      '--ha-surface3': '#e5e7eb',
      '--ha-border': 'rgba(0,0,0,0.10)',
      '--ha-text': '#000000',
      '--ha-text-muted': '#374151',
      '--ha-text-faint': '#6b7280',
      '--ha-sidebar-bg': '#f9fafb',
      '--ha-accent': '#7c3aed',
      '--ha-hover': 'rgba(0,0,0,0.05)',
    },
  },
  'light-offwhite': {
    label: 'Clair Blanc Cassé',
    group: 'light',
    groupLabel: 'Mode Clair',
    description: 'Fond blanc pur, texte noir',
    preview: ['#ffffff', '#f9fafb', '#6d28d9'],
    vars: {
      '--ha-bg': '#ffffff',
      '--ha-surface': '#ffffff',
      '--ha-surface2': '#f9fafb',
      '--ha-surface3': '#f3f4f6',
      '--ha-border': 'rgba(0,0,0,0.10)',
      '--ha-text': '#000000',
      '--ha-text-muted': '#374151',
      '--ha-text-faint': '#6b7280',
      '--ha-sidebar-bg': '#f9fafb',
      '--ha-accent': '#6d28d9',
      '--ha-hover': 'rgba(0,0,0,0.05)',
    },
  },
};

const ThemeContext = createContext({ theme: 'light-offwhite', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    localStorage.getItem('harchive-theme') || 'light-offwhite'
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

    // For light themes: reset shadcn/ui CSS vars to light values so bg-card, bg-background etc. go white
    if (def.group === 'light') {
      root.style.setProperty('--card', '220 14% 98%');         // #f9fafb - same as sidebar
      root.style.setProperty('--card-foreground', '0 0% 3.9%');
      root.style.setProperty('--background', '215 9% 94%');    // #eef0f3
      root.style.setProperty('--foreground', '0 0% 3.9%');
      root.style.setProperty('--popover', '220 14% 98%');
      root.style.setProperty('--popover-foreground', '0 0% 3.9%');
      root.style.setProperty('--muted', '0 0% 96.1%');
      root.style.setProperty('--muted-foreground', '0 0% 45.1%');
      root.style.setProperty('--secondary', '0 0% 96.1%');
      root.style.setProperty('--secondary-foreground', '0 0% 9%');
      root.style.setProperty('--border', '0 0% 89.8%');
      root.style.setProperty('--input', '0 0% 89.8%');
    } else {
      root.style.setProperty('--card', '0 0% 3.9%');
      root.style.setProperty('--card-foreground', '0 0% 98%');
      root.style.setProperty('--background', '0 0% 3.9%');
      root.style.setProperty('--foreground', '0 0% 98%');
      root.style.setProperty('--popover', '0 0% 3.9%');
      root.style.setProperty('--popover-foreground', '0 0% 98%');
      root.style.setProperty('--muted', '0 0% 14.9%');
      root.style.setProperty('--muted-foreground', '0 0% 63.9%');
      root.style.setProperty('--secondary', '0 0% 14.9%');
      root.style.setProperty('--secondary-foreground', '0 0% 98%');
      root.style.setProperty('--border', '0 0% 14.9%');
      root.style.setProperty('--input', '0 0% 14.9%');
    }

    // Apply background & color directly to body
    document.body.style.backgroundColor = def.vars['--ha-bg'];
    document.body.style.color = def.vars['--ha-text'];
  };

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('harchive-theme', t);
    applyTheme(t);
  };

  // Apply on mount + expose applyTheme globally for page-level overrides
  useEffect(() => {
    applyTheme(theme);
    window.__applyHarchiveTheme = applyTheme;
    return () => { delete window.__applyHarchiveTheme; };
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
