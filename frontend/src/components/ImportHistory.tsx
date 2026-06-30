import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchImportHistory, undoImport } from '../services/endpoints';
import { Card, CardBody } from './ui/Card';
import { LoadingSpinner, EmptyState } from './ui/States';
import { Undo2 } from 'lucide-react';

export function ImportHistory() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['import-history'],
    queryFn: () => fetchImportHistory({ limit: 20 }),
  });

  const undoMutation = useMutation({
    mutationFn: (batchId: number) => undoImport(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const batches = data?.data ?? [];

  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4">Import History</h3>
        {isLoading ? (
          <LoadingSpinner />
        ) : batches.length === 0 ? (
          <EmptyState title="No imports yet" description="Upload a CSV to see import history" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider font-mono">
                  <th className="py-2 px-3 font-normal">File</th>
                  <th className="py-2 px-3 font-normal">Date</th>
                  <th className="py-2 px-3 font-normal">Rows</th>
                  <th className="py-2 px-3 font-normal">Status</th>
                  <th className="py-2 px-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm divide-y divide-outline-variant/30">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 px-3">{b.filename}</td>
                    <td className="py-2 px-3 text-on-surface-variant">
                      {new Date(b.imported_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">{b.imported_rows} / {b.total_rows}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        b.status === 'completed' ? 'bg-primary-fixed-dim/10 text-primary-fixed-dim border border-primary-fixed-dim/30' :
                        b.status === 'rolled_back' ? 'bg-error-container/30 text-error border border-error/30' :
                        'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {b.status === 'completed' && (
                        <button
                          onClick={() => undoMutation.mutate(b.id)}
                          disabled={undoMutation.isPending}
                          className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                          title="Undo import"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
