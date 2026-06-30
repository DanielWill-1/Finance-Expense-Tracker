import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <StatusBar />
      </div>
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
    <div className="h-7 border-t border-outline-variant bg-surface px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-primary-fixed-dim' : 'bg-error'}`} />
        <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
          {isConnected ? 'System Healthy' : 'Disconnected'}
        </span>
      </div>
      <span className="text-[11px] font-mono text-on-surface-variant">
        GhostLedger v1.0.0
      </span>
    </div>
  );
}
