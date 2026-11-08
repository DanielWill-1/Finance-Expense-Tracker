import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { TransactionModal } from '../components/TransactionModal';

export default function AppLayout() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const onAddTransaction = () => setShowAddTransaction(true);

  return (
    <div className="min-h-dvh bg-background text-on-surface md:flex md:h-dvh md:min-h-0 md:overflow-hidden">
      <Sidebar onAddTransaction={onAddTransaction} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:ml-[72px] md:h-dvh md:min-h-0 lg:ml-[232px]">
        <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:min-h-0 md:overflow-y-auto md:pb-0">
          <Outlet context={{ onAddTransaction }} />
        </main>
        <StatusBar />
      </div>
      {showAddTransaction && <TransactionModal onClose={() => setShowAddTransaction(false)} />}
    </div>
  );
}

function StatusBar() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await apiClient.get('/health');
      return data;
    },
    refetchInterval: 30_000,
  });

  const isConnected = data?.data?.database === 'connected';

  return (
    <footer className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex h-8 items-center justify-between border-t border-outline-variant bg-white px-5 text-xs md:static md:h-9 md:flex-none md:px-6 lg:px-8">
      <div className="flex items-center gap-2" role="status" aria-live="polite">
        <div
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-primary-fixed-dim' : 'bg-error'}`}
        />
        <span className="text-on-surface-variant">
          {isConnected ? 'Database connected' : 'Database disconnected'}
        </span>
      </div>
      <span className="text-on-surface-variant">GhostLedger v1.0.0</span>
    </footer>
  );
}
