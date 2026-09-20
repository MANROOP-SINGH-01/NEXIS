
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useUiStore } from './integration/store/uiStore';
import { useCoreStore } from './integration/store/coreStore';

(window as any).useUiStore = useUiStore;
(window as any).useCoreStore = useCoreStore;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
