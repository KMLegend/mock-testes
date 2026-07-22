import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/styles/tokens.css';
import { CompositionRoot } from './ui/providers/CompositionRoot';
import { App } from './ui/App';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CompositionRoot>
        <App />
      </CompositionRoot>
    </React.StrictMode>
  );
}
