import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary-fixed-dim" />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-1">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant max-w-md">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-error-container/30 border border-error/30 flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-1">Something went wrong</h3>
      <p className="text-sm text-on-surface-variant mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm hover:bg-primary-container transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}
