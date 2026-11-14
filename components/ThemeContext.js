import { createContext, useContext } from 'react';
import { DEFAULT_CONFIG } from '@/src/lib/themes';

export const ThemeContext = createContext({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
  openStudio: () => {},
});

export const useTheme = () => useContext(ThemeContext);
