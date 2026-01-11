import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import 'uno.css'
import './styles.css'

import {initI18n} from './plugin/providers/i18n';

initI18n();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

