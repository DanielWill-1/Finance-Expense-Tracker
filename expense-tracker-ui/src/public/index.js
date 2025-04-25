import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';  // Optional: You can use your own styles here
import App from './App';  // Make sure you have App.js in the same folder
import reportWebVitals from './reportWebVitals';  // Optional for performance monitoring

// Rendering the App component to the root element in index.html
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Optional: You can add performance tracking
reportWebVitals();
