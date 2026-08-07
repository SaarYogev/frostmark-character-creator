import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './app.css';

// Initialize the app
const container = document.getElementById('app');
if (!container) {
  throw new Error('Could not find #app element');
}

ReactDOM.createRoot(container).render(<App />);