import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/healthService';

function StatusBar() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const health = data?.data;
  const isConnected = health?.database === 'connected';

  return (
    <div className="flex h-7 items-center justify-between border-t border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : health?.database === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}
        />
        <span className="text-xs text-text-muted">
          {isConnected
            ? 'Database connected'
            : health?.database === 'error'
              ? 'Database error'
              : 'Connecting...'}
        </span>
      </div>
      <span className="text-xs text-text-muted">
        {health ? `API ${health.status} · ${health.environment}` : 'Connecting...'}
      </span>
    </div>
  );
}

export default StatusBar;
