import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredTheme } from './store/prefs';

applyStoredTheme();

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
