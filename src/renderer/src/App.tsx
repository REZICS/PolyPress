import {ThemeProvider} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import {StyledEngineProvider} from '@mui/material/styles';
import {StrictMode, useEffect, useMemo} from 'react';
import 'github-markdown-css/github-markdown-light.css';

import {
  applyDynamicThemeToDOM,
  generateDynamicColors,
} from './config/dynamicTheme';
import {getDynamicTheme, getTheme} from './config/theme';
import {appStore} from './store/appStore';
import {PersistentSettingsLoader} from './plugin/providers/PersistentSettingsLoader';
import Router from './router/router';

import {ErrorBoundary} from 'react-error-boundary';
import {WindowAlert} from './component/Common/Overlay/WindowAlert';
import {HelpFab} from './component/Common/UI/Button/HelpWidget';
import {HelmetProvider} from 'react-helmet-async';

import {useScrollRestore} from './util/useScrollRestore';
import {startThrottledScroll} from './util/ScrollUtil';
import {scroll} from './util/ScrollUtil';
import {useLocation} from 'wouter';
import {useAppInit} from './plugin/providers/useAppInit';

export default function App() {
  const themeMode = appStore(s => s.theme);
  const customColor = appStore(s => s.customColor);
  const useDynamicTheme = appStore(s => s.useDynamicTheme);
  const [location, _navigate] = useLocation();

  useAppInit();

  const theme = useMemo(() => {
    if (useDynamicTheme && customColor) {
      return getDynamicTheme(themeMode, customColor);
    }
    return getTheme(themeMode, customColor);
  }, [themeMode, customColor, useDynamicTheme]);

  useScrollRestore(location, startThrottledScroll, scroll);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', themeMode === 'dark');

    if (useDynamicTheme && customColor) {
      const dynamicColors = generateDynamicColors(
        customColor,
        themeMode === 'dark',
      );
      applyDynamicThemeToDOM(dynamicColors, themeMode === 'dark');
    }
  }, [themeMode, customColor, useDynamicTheme]);

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <StrictMode>
        <HelmetProvider>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <PersistentSettingsLoader />
                <>
                  {Router}
                  <WindowAlert />
                  <HelpFab />
                </>
            </ThemeProvider>
          </StyledEngineProvider>
        </HelmetProvider>
      </StrictMode>
    </ErrorBoundary>
  );
}
