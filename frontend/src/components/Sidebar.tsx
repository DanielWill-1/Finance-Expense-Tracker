import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Bot, LayoutDashboard, Plus, Settings, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function Sidebar({ onAddTransaction }: { onAddTransaction: () => void }) {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[208px] flex-col border-r border-outline-variant bg-sidebar px-4 py-6 md:flex lg:w-[232px] lg:px-5">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-fixed-dim">
            <Wallet aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-[-0.02em] text-on-surface">
              GhostLedger
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">Personal finance</p>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="mt-10 flex-1 space-y-1">
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/ledger" icon={Wallet} label="Ledger" />
          <SidebarLink to="/assistant" icon={Bot} label="AI Assistant" />
          <SidebarLink to="/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="mt-auto space-y-4 border-t border-outline-variant pt-5">
          {!isDashboard && (
            <button
              type="button"
              onClick={onAddTransaction}
              aria-label="Add transaction"
              title="Add transaction"
              className="flex min-h-11 w-full items-center justify-start gap-2 rounded-lg bg-primary-fixed-dim px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>Add Transaction</span>
            </button>
          )}
          <p className="text-xs leading-5 text-on-surface-variant">Local-first · no sign-in</p>
        </div>
      </aside>

      <nav
        aria-label="Primary navigation"
        className={`fixed inset-x-0 bottom-0 z-40 grid min-h-16 border-t border-outline-variant bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] shadow-mobile-nav md:hidden ${
          isDashboard ? 'grid-cols-4' : 'grid-cols-[repeat(4,minmax(0,1fr))_3.5rem]'
        }`}
      >
        <MobileSidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
        <MobileSidebarLink to="/ledger" icon={Wallet} label="Ledger" />
        <MobileSidebarLink to="/assistant" icon={Bot} label="AI Assistant" />
        <MobileSidebarLink to="/settings" icon={Settings} label="Settings" />
        {!isDashboard && (
          <button
            type="button"
            onClick={onAddTransaction}
            aria-label="Add transaction"
            title="Add transaction"
            className="my-2 mr-1 flex min-h-11 items-center justify-center rounded-xl bg-primary-fixed-dim text-on-primary transition-colors hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </nav>
    </>
  );
}

function SidebarLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        `flex min-h-11 items-center justify-start gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isActive
            ? 'bg-selected/10 font-semibold text-primary-fixed-dim'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
        }`
      }
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  );
}

function MobileSidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) =>
        `mx-0.5 my-1 flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isActive
            ? 'bg-selected/10 text-primary-fixed-dim'
            : 'text-on-surface-variant hover:bg-surface-container-low'
        }`
      }
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default Sidebar;
