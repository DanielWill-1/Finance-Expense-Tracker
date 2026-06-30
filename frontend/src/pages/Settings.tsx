import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchSettings, updateSettings } from '../services/endpoints';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner, ErrorState } from '../components/ui/States';
import { MemoryStick, Database, CloudDownload, Trash2, Terminal, HelpCircle, Plus, X } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-margin-desktop space-y-6">
      <header className="h-16 border-b border-outline-variant flex items-center justify-between -mx-margin-desktop px-margin-desktop -mt-margin-desktop mb-6 bg-background/90 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-on-surface">Settings</h1>
        <button className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <LLMConfig />
          <CategoryRules />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <DatabaseInfo />
          <AppInfo />
        </div>
      </div>
    </div>
  );
}

function LLMConfig() {
  const queryClient = useQueryClient();
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchSettings(),
  });

  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');

  const mutation = useMutation({
    mutationFn: (settings: Record<string, string>) => updateSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  function handleSave() {
    mutation.mutate({
      ai_provider: provider,
      ai_model: model,
      ai_endpoint: endpoint,
    });
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="Failed to load settings" onRetry={() => refetch()} />;

  return (
    <Card>
      <div className="p-6 pb-4 border-b border-outline-variant/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-on-surface flex items-center">
            <MemoryStick className="h-5 w-5 mr-2 text-primary-fixed-dim" />
            LLM Configuration
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">Configure the AI provider for automatic categorization and analysis.</p>
        </div>
      </div>
      <CardBody>
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-mono">Provider</label>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (Local)</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-mono">API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-mono">Endpoint URL</label>
              <Input
                type="text"
                placeholder="https://..."
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-mono">Model</label>
            <Input
              type="text"
              placeholder="gpt-4o"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm">
              Test Connection
            </Button>
            <Button size="sm" onClick={handleSave} loading={mutation.isPending}>
              Save Config
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CategoryRules() {
  const [rules, setRules] = useState<{ id: number; match: string; category: string }[]>([
    { id: 1, match: 'AMZN', category: 'Shopping' },
    { id: 2, match: 'UBER', category: 'Transport' },
    { id: 3, match: 'NETFLIX', category: 'Subscriptions' },
    { id: 4, match: 'WHOLEFDS', category: 'Groceries' },
  ]);

  function removeRule(id: number) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Card>
      <div className="p-6 pb-4 border-b border-outline-variant/50 flex items-center justify-between bg-surface-container-highest/20">
        <div>
          <h3 className="text-base font-medium text-on-surface flex items-center">
            <span className="h-5 w-5 mr-2 text-primary-fixed-dim">≡</span>
            Category Mapping Rules
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">Deterministic rules applied before AI processing.</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" /> New Rule
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider bg-surface/50 font-mono">
              <th className="px-6 py-3 font-normal">Match String</th>
              <th className="px-6 py-3 font-normal">Target Category</th>
              <th className="px-6 py-3 font-normal text-right w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm divide-y divide-outline-variant/30">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-surface-container-high/30 transition-colors group">
                <td className="px-6 py-3">{rule.match}</td>
                <td className="px-6 py-3">
                  <span className="inline-block px-2 py-1 bg-surface-bright text-on-surface border border-outline-variant rounded text-xs">
                    {rule.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DatabaseInfo() {
  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4 flex items-center border-b border-outline-variant/50 pb-4">
          <Database className="h-5 w-5 mr-2 text-primary-fixed-dim" />
          Database Utilities
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Status</span>
            <span className="flex items-center text-primary-fixed-dim font-mono text-sm">
              <span className="w-2 h-2 rounded-full bg-primary-fixed-dim mr-2 animate-pulse" />
              Healthy
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Storage</span>
            <span className="font-mono text-sm text-on-surface">Local SQLite</span>
          </div>
          <div className="border-b border-outline-variant/30 pb-4" />
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full">
              <CloudDownload className="h-4 w-4" />
              Backup DB
            </Button>
            <Button variant="danger" size="sm" className="w-full">
              <Trash2 className="h-4 w-4" />
              Purge Data
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function AppInfo() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center opacity-80">
      <Terminal className="h-9 w-9 mx-auto mb-2 text-outline" />
      <p className="font-mono text-sm text-on-surface-variant">GhostLedger v1.0.0</p>
      <p className="text-xs text-outline mt-1 uppercase tracking-wider">Build local-first</p>
    </div>
  );
}
