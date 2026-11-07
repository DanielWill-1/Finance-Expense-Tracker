import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsSummary } from '../services/endpoints';
import { LayoutDashboard, Wallet, Bot, Settings, Plus } from 'lucide-react';

function Sidebar({ onAddTransaction }: { onAddTransaction: () => void }) {
  const { data } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => fetchAnalyticsSummary(),
    refetchInterval: 30_000,
  });

  const netWorthValue = data?.data?.netWorth;
  const netWorth =
    typeof netWorthValue === 'number' && Number.isFinite(netWorthValue)
      ? formatCurrency(netWorthValue, data?.data?.netWorthByCurrency?.[0]?.currency ?? 'INR')
      : (data?.data?.netWorthByCurrency ?? [])
          .map((item) => `${item.currency} ${formatCurrency(item.amount, item.currency)}`)
          .join(' · ') || '—';

  function formatCurrency(n: number, currency = 'INR') {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  }

  return (
    <aside className="w-14 md:w-64 h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low z-20 flex flex-col py-4">
      <div className="px-1 md:px-4 mb-6">
        <h1 className="hidden md:block text-xl font-bold text-on-surface tracking-tight mb-4">
          GhostLedger
        </h1>
        <span className="md:hidden mb-3 block text-center font-bold text-primary-fixed-dim">
          GL
        </span>
        <div className="hidden md:flex p-3 border border-outline-variant rounded-lg bg-surface items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-bright border border-outline-variant flex items-center justify-center text-primary-fixed-dim font-mono font-bold text-xs">
            GL
          </div>
          <div>
            <p className="font-mono text-sm text-on-surface">{netWorth}</p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">
              Net Worth
            </p>
          </div>
        </div>
        <button
          onClick={onAddTransaction}
          aria-label="Add transaction"
          className="mt-2 md:mt-4 w-full bg-primary-fixed-dim text-on-primary font-mono text-sm font-medium py-2 md:px-4 rounded flex items-center justify-center gap-1 md:gap-2 hover:bg-primary-fixed transition-colors min-h-10"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Add Transaction</span>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-1 md:px-4">
        <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
        <SidebarLink to="/ledger" icon={Wallet} label="Ledger" />
        <SidebarLink to="/assistant" icon={Bot} label="AI Assistant" />
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant px-1 md:px-4">
        <p className="hidden md:block pl-4 py-2 text-xs text-on-surface-variant">
          Local-only · no sign-in
        </p>
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
      aria-label={label}
      className={({ isActive }) =>
        `flex items-center justify-center md:justify-start gap-3 px-0 md:pl-4 py-2 rounded font-medium text-sm transition-colors ${
          isActive
            ? 'text-primary-fixed-dim font-bold border-l-2 border-primary-fixed-dim bg-surface-container-high/50'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

export default Sidebar;
