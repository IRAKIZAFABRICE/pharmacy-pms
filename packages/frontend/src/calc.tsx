// packages/frontend/src/calc.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import ScientificCalculator from './components/ScientificCalculator';
import './index.css';

ReactDOM.createRoot(document.getElementById('calc-root')!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <ScientificCalculator />
    </div>
  </React.StrictMode>
);
