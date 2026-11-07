import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAccount,
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  fetchAccounts,
  fetchCategories,
  fetchHealth,
  fetchRules,
  fetchSettings,
  purgeDatabase,
  restoreDatabaseBackup,
  updateAccount,
  updateRule,
  updateSettings,
} from '../services/endpoints';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner, ErrorState } from '../components/ui/States';
import {
  Database,
  HelpCircle,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Download,
  Upload,
} from 'lucide-react';
import { invalidateFinanceQueries } from '../services/queryInvalidation';
import type { Account } from '../types/api';

type RuleRow = {
  id: number;
  priority: number;
  contains_text: string | null;
  starts_with: string | null;
  ends_with: string | null;
  regex: string | null;
  category_id: number | null;
  enabled: number;
};
type RuleCondition = 'containsText' | 'startsWith' | 'endsWith' | 'regex';

export default function Settings() {
  return (
    <div className="p-margin-mobile md:p-margin-desktop space-y-6">
      <header className="h-16 border-b border-outline-variant flex items-center justify-between -mx-margin-mobile px-margin-mobile md:-mx-margin-desktop md:px-margin-desktop -mt-margin-mobile md:-mt-margin-desktop mb-6 bg-background/90 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-on-surface">Settings</h1>
        <span
          aria-label="Settings are stored locally"
          title="Local settings are stored in this database"
          className="text-on-surface-variant"
        >
          <HelpCircle className="h-5 w-5" />
        </span>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <ProviderPreferences />
          <CategoryRules />
          <DataSetup />
        </div>
        <div className="xl:col-span-4 space-y-6">
          <DatabaseInfo />
          <AppInfo />
        </div>
      </div>
    </div>
  );
}

function ProviderPreferences() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const [provider, setProvider] = useState('openai');
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      setMessage('Preferences saved. The AI backend is still unavailable.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: Error) => setMessage(error.message || 'Could not save preferences'),
  });

  useEffect(() => {
    const current = query.data?.data;
    if (!current) return;
    setProvider(current.ai_provider || 'openai');
    setEndpoint(current.ai_endpoint || 'https://api.openai.com/v1');
    setModel(current.ai_model || '');
  }, [query.data]);

  if (query.isLoading) return <LoadingSpinner />;
  if (query.error)
    return <ErrorState message="Failed to load settings" onRetry={() => query.refetch()} />;

  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-medium text-on-surface">AI provider preferences</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          The AI backend is not implemented. These preferences do not enable AI or send data
          anywhere.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-on-surface-variant">
            Provider
            <Select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (local)</option>
            </Select>
          </label>
          <label className="text-xs text-on-surface-variant">
            Model
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              maxLength={100}
              placeholder="Optional"
            />
          </label>
          <label className="md:col-span-2 text-xs text-on-surface-variant">
            Endpoint URL
            <Input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              maxLength={300}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p role="status" className="text-sm text-on-surface-variant">
            {message}
          </p>
          <Button
            size="sm"
            onClick={() => {
              setMessage('');
              mutation.mutate({ ai_provider: provider, ai_model: model, ai_endpoint: endpoint });
            }}
            loading={mutation.isPending}
          >
            <Save className="h-4 w-4" /> Save preferences
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function CategoryRules() {
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({ queryKey: ['rules'], queryFn: fetchRules });
  const categoriesQuery = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => fetchCategories(),
  });
  const rules = (rulesQuery.data?.data ?? []) as RuleRow[];
  const categories = categoriesQuery.data?.data ?? [];
  const [id, setId] = useState<number | null>(null);
  const [condition, setCondition] = useState<RuleCondition>('containsText');
  const [match, setMatch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('0');
  const [message, setMessage] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['rules'] });
  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        containsText: null,
        startsWith: null,
        endsWith: null,
        regex: null,
        [condition]: match.trim(),
        categoryId: Number(categoryId),
        priority: Number(priority),
        enabled: true,
      };
      return id === null ? createRule(input) : updateRule(id, input);
    },
    onSuccess: () => {
      setMessage('Rule saved');
      refresh();
      reset();
    },
    onError: (error: Error) => setMessage(error.message || 'Could not save rule'),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ ruleId, enabled }: { ruleId: number; enabled: boolean }) =>
      updateRule(ruleId, { enabled }),
    onSuccess: refresh,
    onError: (error: Error) => setMessage(error.message),
  });
  const removeMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: refresh,
    onError: (error: Error) => setMessage(error.message || 'Could not delete rule'),
  });

  function reset() {
    setId(null);
    setCondition('containsText');
    setMatch('');
    setCategoryId('');
    setPriority('0');
  }
  function edit(rule: RuleRow) {
    const choice: [RuleCondition, string][] = [
      ['containsText', rule.contains_text ?? ''],
      ['startsWith', rule.starts_with ?? ''],
      ['endsWith', rule.ends_with ?? ''],
      ['regex', rule.regex ?? ''],
    ];
    const active = choice.find(([, value]) => value);
    setId(rule.id);
    setCondition(active?.[0] ?? 'containsText');
    setMatch(active?.[1] ?? '');
    setCategoryId(rule.category_id ? String(rule.category_id) : '');
    setPriority(String(rule.priority));
    setMessage('');
  }

  if (rulesQuery.isLoading || categoriesQuery.isLoading) return <LoadingSpinner />;
  if (rulesQuery.error || categoriesQuery.error)
    return (
      <ErrorState
        message="Failed to load rules or categories"
        onRetry={() => {
          rulesQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
    );

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-medium text-on-surface">Category rules</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Enabled rules apply from highest priority to lowest during import.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              setMessage('');
            }}
          >
            <Plus className="h-4 w-4" /> New rule
          </Button>
        </div>
        <form
          className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage('');
            saveMutation.mutate();
          }}
        >
          <label className="md:col-span-3 text-xs text-on-surface-variant">
            Match type
            <Select
              value={condition}
              onChange={(event) => setCondition(event.target.value as RuleCondition)}
            >
              <option value="containsText">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="endsWith">Ends with</option>
              <option value="regex">Regex</option>
            </Select>
          </label>
          <label className="md:col-span-4 text-xs text-on-surface-variant">
            Match value
            <Input
              value={match}
              onChange={(event) => setMatch(event.target.value)}
              required
              maxLength={128}
            />
          </label>
          <label className="md:col-span-3 text-xs text-on-surface-variant">
            Category
            <Select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="md:col-span-1 text-xs text-on-surface-variant">
            Priority
            <Input
              type="number"
              min={-10000}
              max={10000}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            />
          </label>
          <div className="md:col-span-1 flex items-end">
            <Button size="sm" type="submit" loading={saveMutation.isPending}>
              {id === null ? 'Add' : 'Save'}
            </Button>
          </div>
        </form>
        {message && (
          <p role="status" className="mt-3 text-sm text-on-surface-variant">
            {message}
          </p>
        )}
        <div className="mt-5 divide-y divide-outline-variant/50">
          {rules.length === 0 ? (
            <p className="py-5 text-sm text-on-surface-variant">No persisted rules yet.</p>
          ) : (
            rules.map((rule) => {
              const conditionText = rule.contains_text
                ? `contains “${rule.contains_text}”`
                : rule.starts_with
                  ? `starts with “${rule.starts_with}”`
                  : rule.ends_with
                    ? `ends with “${rule.ends_with}”`
                    : `regex “${rule.regex}”`;
              const target =
                categories.find((category) => category.id === rule.category_id)?.name ??
                'Missing category';
              return (
                <div key={rule.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <input
                    aria-label={`Enable rule ${conditionText}`}
                    type="checkbox"
                    checked={rule.enabled === 1}
                    onChange={(event) =>
                      toggleMutation.mutate({ ruleId: rule.id, enabled: event.target.checked })
                    }
                  />
                  <span className="min-w-0 flex-1 text-on-surface">
                    {conditionText} <span className="text-on-surface-variant">→ {target}</span>
                  </span>
                  <span className="text-xs text-on-surface-variant">Priority {rule.priority}</span>
                  <button
                    aria-label={`Edit rule ${conditionText}`}
                    onClick={() => edit(rule)}
                    className="text-primary-fixed-dim underline"
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Delete rule ${conditionText}`}
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete rule ${conditionText}?`))
                        removeMutation.mutate(rule.id);
                    }}
                    className="text-error disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function DataSetup() {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({ queryKey: ['accounts-all'], queryFn: fetchAccounts });
  const categoriesQuery = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => fetchCategories(),
  });
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [message, setMessage] = useState('');
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['categories-all'] });
    invalidateFinanceQueries(queryClient);
  };
  const addAccount = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      setAccountName('');
      setMessage('Account added');
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Could not add account'),
  });
  const toggleAccount = useMutation({
    mutationFn: ({ account, active }: { account: Account; active: boolean }) =>
      updateAccount(account.id, { isActive: active }),
    onSuccess: refresh,
    onError: (error: Error) => setMessage(error.message || 'Could not update account'),
  });
  const addCategory = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      setCategoryName('');
      setMessage('Category added');
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Could not add category'),
  });
  const removeCategory = useMutation({
    mutationFn: deleteCategory,
    onSuccess: refresh,
    onError: (error: Error) => setMessage(error.message || 'Could not delete category'),
  });

  if (accountsQuery.isLoading || categoriesQuery.isLoading) return <LoadingSpinner />;
  if (accountsQuery.error || categoriesQuery.error)
    return (
      <ErrorState
        message="Failed to load accounts or categories"
        onRetry={() => {
          accountsQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
    );
  const accounts = accountsQuery.data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];

  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-medium text-on-surface">Accounts and categories</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Set up an empty database here. Account balances are current snapshots; negative balances
          represent liabilities.
        </p>
        {message && (
          <p role="status" className="mt-3 text-sm text-on-surface-variant">
            {message}
          </p>
        )}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h3 className="mb-3 text-sm font-medium text-on-surface">Accounts</h3>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage('');
                addAccount.mutate({
                  name: accountName.trim(),
                  balance: Number(accountBalance),
                  currency,
                });
              }}
            >
              <Input
                aria-label="Account name"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Account name"
                required
                maxLength={100}
              />
              <Input
                aria-label="Opening/current balance"
                type="number"
                step="0.01"
                value={accountBalance}
                onChange={(event) => setAccountBalance(event.target.value)}
                className="max-w-36"
              />
              <Input
                aria-label="Currency code"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={3}
                className="max-w-24"
              />
              <Button type="submit" size="sm" loading={addAccount.isPending}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>
            <ul className="mt-3 divide-y divide-outline-variant/40">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    {account.name} · {account.currency} {Number(account.balance).toFixed(2)}
                  </span>
                  <button
                    onClick={() =>
                      toggleAccount.mutate({ account, active: account.is_active !== 1 })
                    }
                    className="text-xs text-primary-fixed-dim underline"
                  >
                    {account.is_active === 1 ? 'Deactivate' : 'Activate'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-medium text-on-surface">Categories</h3>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage('');
                addCategory.mutate({ name: categoryName.trim(), type: categoryType });
              }}
            >
              <Input
                aria-label="Category name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Category name"
                required
                maxLength={100}
              />
              <Select
                aria-label="Category type"
                value={categoryType}
                onChange={(event) => setCategoryType(event.target.value as 'income' | 'expense')}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
              <Button type="submit" size="sm" loading={addCategory.isPending}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>
            <ul className="mt-3 divide-y divide-outline-variant/40">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    {category.name}{' '}
                    <span className="text-xs text-on-surface-variant">{category.type}</span>
                  </span>
                  <button
                    aria-label={`Delete category ${category.name}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${category.name}? Existing transactions will become uncategorized and matching rules will be removed.`,
                        )
                      )
                        removeCategory.mutate(category.id);
                    }}
                    className="text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CardBody>
    </Card>
  );
}

function DatabaseInfo() {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth, refetchInterval: 30_000 });
  const backupPicker = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const refreshData = () => {
    invalidateFinanceQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ['accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['categories-all'] });
    queryClient.invalidateQueries({ queryKey: ['import-history'] });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    queryClient.invalidateQueries({ queryKey: ['rules'] });
  };
  const restoreMutation = useMutation({
    mutationFn: restoreDatabaseBackup,
    onSuccess: (response) => {
      setMessage(
        `Restored database. Previous data is backed up as ${response.data?.recoveryBackup}.`,
      );
      refreshData();
    },
    onError: (error: Error) =>
      setMessage(error.message || 'Restore failed; current data was not replaced.'),
  });
  const purgeMutation = useMutation({
    mutationFn: purgeDatabase,
    onSuccess: (response) => {
      const counts = response.data?.counts ?? {};
      setMessage(
        `Removed ${counts.transactions ?? 0} transactions, ${counts.importBatches ?? 0} imports, ${counts.rules ?? 0} rules, ${counts.categories ?? 0} categories, ${counts.accounts ?? 0} accounts, and ${counts.settings ?? 0} settings. Recovery backup: ${response.data?.recoveryBackup}.`,
      );
      refreshData();
    },
    onError: (error: Error) =>
      setMessage(error.message || 'Purge failed; current data was not changed.'),
  });
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 flex items-center border-b border-outline-variant/50 pb-4 text-base font-medium text-on-surface">
          <Database className="mr-2 h-5 w-5 text-primary-fixed-dim" />
          Database health
        </h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">SQLite</span>
          <span
            className={
              health.data?.data?.database === 'connected' ? 'text-primary-fixed-dim' : 'text-error'
            }
          >
            {health.isLoading
              ? 'Checking…'
              : health.data?.data?.database === 'connected'
                ? 'Connected'
                : 'Unavailable'}
          </span>
        </div>
        {health.error && (
          <button
            onClick={() => health.refetch()}
            className="mt-3 flex items-center gap-2 text-xs text-primary-fixed-dim"
          >
            <RefreshCw className="h-3 w-3" />
            Retry health check
          </button>
        )}
        <p className="mt-4 text-xs text-on-surface-variant">
          Data stays in your local SQLite database. Download a backup before restoring or purging;
          restore and purge create a recovery copy first.
        </p>
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.location.assign('/api/data/backup')}
          >
            <Download className="h-4 w-4" /> Download database backup
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.location.assign('/api/data/export.csv')}
          >
            <Download className="h-4 w-4" /> Export transactions CSV
          </Button>
          <input
            ref={backupPicker}
            className="sr-only"
            type="file"
            accept=".db,.sqlite,.sqlite3,.backup"
            aria-label="Choose GhostLedger database backup"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setMessage('');
                restoreMutation.mutate(file);
              }
              event.currentTarget.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={restoreMutation.isPending}
            onClick={() => backupPicker.current?.click()}
          >
            <Upload className="h-4 w-4" />{' '}
            {restoreMutation.isPending ? 'Validating and restoring…' : 'Restore database backup'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            disabled={purgeMutation.isPending}
            onClick={() => {
              const confirmation = window.prompt(
                'Purge removes all transactions, import history, rules, categories, accounts, and settings. A recovery backup is created first. Type PURGE to continue.',
              );
              if (confirmation === 'PURGE') {
                setMessage('');
                purgeMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />{' '}
            {purgeMutation.isPending ? 'Creating backup and purging…' : 'Purge all local data'}
          </Button>
          {message && (
            <p role="status" className="break-words text-xs text-on-surface-variant">
              {message}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function AppInfo() {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-center">
      <p className="font-mono text-sm text-on-surface-variant">GhostLedger v1.0.0</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Local ledger · no sign-in · AI backend unavailable
      </p>
    </div>
  );
}
