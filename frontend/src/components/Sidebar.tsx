import { NavLink } from 'react-router-dom';
import { ReactNode } from 'react';

function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-surface-raised">
      <div className="flex h-14 items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          GL
        </div>
        <span className="text-sm font-semibold tracking-wide text-text-primary">
          GhostLedger
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        <NavItem to="/" icon={DashboardIcon} label="Dashboard" />
        <NavItem to="/ledger" icon={LedgerIcon} label="Ledger" />
        <NavItem to="/assistant" icon={AssistantIcon} label="AI Assistant" />
        <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-text-muted">GhostLedger v1.0.0</p>
      </div>
    </aside>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: () => ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-surface-overlay text-accent'
            : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
        }`
      }
    >
      <span className="flex h-5 w-5 items-center justify-center">
        <Icon />
      </span>
      {label}
    </NavLink>
  );
}

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.041c0 .414.336.75.75.75h16.5a.75.75 0 0 0 .75-.75V4.5A1.5 1.5 0 0 0 17.5 3h-15Zm0 6A1.5 1.5 0 0 0 1 10.5v2A1.5 1.5 0 0 0 2.5 14h5A1.5 1.5 0 0 0 9 12.5v-2A1.5 1.5 0 0 0 7.5 9h-5Zm8.5 3a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 11 12Zm.75 2.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 2.165 2.165 0 0 0-1.66.697c-.356.404-.69.955-.897 1.358a2.957 2.957 0 0 0-.296.732 2.657 2.657 0 0 0-.075.346 27.02 27.02 0 0 1-.076.376c-.05.238-.116.492-.194.732a.75.75 0 0 1-1.426-.004 4.225 4.225 0 0 1-.284-1.31c-.02-.25-.03-.549-.04-.854a26.899 26.899 0 0 0-.04-.697c-.006-.147-.014-.316-.02-.45a2.189 2.189 0 0 0-.573-1.187c-.36-.396-.793-.707-1.33-.71Z" />
      <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M7 10.5a.75.75 0 0 0-.75-.75h-.5a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 .75-.75Z" />
      <path d="M13.75 9.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .205 1.251l-1.18 2.044a1 1 0 0 1-1.186.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.113a7.047 7.047 0 0 1 0-2.228L1.821 7.773a1 1 0 0 1-.205-1.251l1.18-2.044a1 1 0 0 1 1.186-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default Sidebar;
