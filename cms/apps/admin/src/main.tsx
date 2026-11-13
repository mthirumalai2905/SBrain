import { createRoot } from 'react-dom/client';
import App from './App';
import { ConfirmHost } from './lib/confirm';
import './styles.css';
import './polish.css'; // the design refresh: loaded last so it wins
import './polish-settings.css';
import './polish-panels.css';
import './polish-plain.css';
import './polish-clean.css';

createRoot(document.getElementById('root')!).render(<><App /><ConfirmHost /></>);
