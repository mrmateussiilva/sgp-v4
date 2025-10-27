import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enableDevtoolsShortcuts } from './utils/devtools';

if (import.meta.env.PROD) {
  enableDevtoolsShortcuts();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


