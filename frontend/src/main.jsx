/**
 * main.jsx
 * ----------------------------
 * Entry point of the React application.
 * Renders the <App /> component inside the root element using ReactDOM.
 * Also applies routing and global context initialization if needed.
 * ----------------------------
 * Editor: 
 * RichelleP, 2025-10
 * LynneL, 2025-10
 */

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
