import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Provider } from 'react-redux';
import { store } from './store.ts';

ModuleRegistry.registerModules([AllCommunityModule]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
