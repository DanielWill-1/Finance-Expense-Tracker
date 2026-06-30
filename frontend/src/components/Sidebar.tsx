import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsSummary } from '../services/endpoints';
import {
  LayoutDashboard,
  Wallet,
  Bot,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react';

function Sidebar({ onAddTransaction }: { onAddTransaction: () => void }) {
  const { data } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => fetchAnalyticsSummary(),
    refetchInterval: 30_000,
  });

  const netWorth = data?.data?.netWorth ?? data?.data?.netSavings ?? 0;

  function formatCurrency(n: number) {
    if (n == null) return '₹0';
    if (Math.abs(n) >= 10000000) return '₹' + (n / 10000000).toFixed(1) + ' Cr';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low z-20 flex flex-col py-4">
      <div className="px-4 mb-6">
        <h1 className="text-xl font-bold text-on-surface tracking-tight mb-4">GhostLedger</h1>
        <div className="p-3 border border-outline-variant rounded-lg bg-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-bright border border-outline-variant flex items-center justify-center text-primary-fixed-dim font-mono font-bold text-xs">
            GL
          </div>
          <div>
            <p className="font-mono text-sm text-on-surface">
              {formatCurrency(netWorth)}
            </p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">
              Net Worth
            </p>
          </div>
        </div>
        <button
          onClick={onAddTransaction}
          className="mt-4 w-full bg-primary-fixed-dim text-on-primary font-mono text-sm font-medium py-2 px-4 rounded flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-4">
        <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
        <SidebarLink to="/ledger" icon={Wallet} label="Ledger" />
        <SidebarLink to="/assistant" icon={Bot} label="AI Assistant" />
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant px-4">
        <button className="flex items-center gap-3 text-on-surface-variant font-medium pl-4 py-2 hover:text-on-surface hover:bg-surface-container-high rounded transition-colors w-full">
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 pl-4 py-2 rounded font-medium text-sm transition-colors ${
          isActive
            ? 'text-primary-fixed-dim font-bold border-l-2 border-primary-fixed-dim bg-surface-container-high/50'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}

export default Sidebar;
