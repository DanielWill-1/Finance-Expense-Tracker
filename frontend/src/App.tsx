import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center bg-background text-sm text-on-surface-variant"
          role="status"
        >
          Loading page…
        </div>
      }
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
