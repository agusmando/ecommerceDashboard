import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
}

const STORAGE_KEY = 'cer_ui';

function load(): UiState {
  const fallback: UiState = {
    theme:
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    sidebarCollapsed: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function persistUi(state: UiState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignorar
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: load,
  reducers: {
    toggleTheme(s) {
      s.theme = s.theme === 'light' ? 'dark' : 'light';
    },
    setTheme(s, a: PayloadAction<Theme>) {
      s.theme = a.payload;
    },
    toggleSidebar(s) {
      s.sidebarCollapsed = !s.sidebarCollapsed;
    },
  },
});

export const { toggleTheme, setTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
