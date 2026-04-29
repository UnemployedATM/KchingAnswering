import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Stamp platform class on <html> at boot for CSS targeting
const ua = navigator.userAgent;
if (/iPad|iPhone|iPod/.test(ua)) document.documentElement.classList.add('ios');
else if (/Android/.test(ua))     document.documentElement.classList.add('android');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
