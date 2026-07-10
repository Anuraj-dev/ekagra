import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme/global.css';
import { tokensToCssVars } from './theme/tokens';

// Inject design tokens as CSS custom properties (single source of truth in tokens.ts).
const style = document.createElement('style');
style.textContent = `:root{${tokensToCssVars()}}`;
document.head.appendChild(style);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(<App />);
