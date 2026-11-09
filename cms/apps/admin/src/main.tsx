import { createRoot } from 'react-dom/client';
import App from './App';
import { ConfirmHost } from './lib/confirm';
import './styles.css';

createRoot(document.getElementById('root')!).render(<><App /><ConfirmHost /></>);
