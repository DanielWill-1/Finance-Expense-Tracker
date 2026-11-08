import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAccount,
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  fetchAccounts,
  fetchAssistantCredential,
  fetchCategories,
  fetchHealth,
  fetchRules,
  fetchSettings,
  fetchAssistantStatus,
  removeAssistantCredential,
  saveAssistantCredential,
  purgeDatabase,
  restoreDatabaseBackup,
  testAssistantConnection,
  updateAccount,
  updateCategory,
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
  Pencil,
  X,
} from 'lucide-react';
import { invalidateFinanceQueries } from '../services/queryInvalidation';
import { apiErrorMessage } from '../services/apiClient';
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
          title="Preferences are stored locally; AI keys use a separate private file"
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
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'groq' | 'ollama'>('openai');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [message, setMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const query = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const statusQuery = useQuery({
    queryKey: ['assistant-status'],
    queryFn: fetchAssistantStatus,
    refetchInterval: 30_000,
  });
  const credentialQuery = useQuery({
    queryKey: ['assistant-credential', provider],
    queryFn: () => fetchAssistantCredential(provider === 'ollama' ? 'openai' : provider),
    enabled: provider !== 'ollama',
  });
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      setMessage('Preferences saved. Saving does not test provider availability.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-status'] });
    },
    onError: (error: Error) => setMessage(error.message || 'Could not save preferences'),
  });
  const testMutation = useMutation({
    mutationFn: testAssistantConnection,
    onSuccess: async (response) => {
      setTestMessage(response.data?.message ?? 'Connection test passed. No ledger data was sent.');
      await queryClient.invalidateQueries({ queryKey: ['assistant-status'] });
    },
    onError: async (error: Error) => {
      setTestMessage(apiErrorMessage(error, 'Connection test failed'));
      await queryClient.invalidateQueries({ queryKey: ['assistant-status'] });
    },
  });
  const saveCredentialMutation = useMutation({
    mutationFn: saveAssistantCredential,
    onSuccess: async (response) => {
      setApiKey('');
      setCredentialMessage('API key saved. It cannot be viewed after saving.');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['assistant-credential', response.data?.provider ?? provider],
        }),
        queryClient.invalidateQueries({ queryKey: ['assistant-status'] }),
      ]);
    },
    onError: (error: Error) => setCredentialMessage(error.message || 'Could not save the API key'),
  });
  const removeCredentialMutation = useMutation({
    mutationFn: removeAssistantCredential,
    onSuccess: async (response) => {
      setCredentialMessage(
        response.data?.source === 'environment'
          ? 'Saved key removed. The server environment key is still active.'
          : 'Saved API key removed.',
      );
      const credentialProvider = response.data?.provider ?? provider;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assistant-credential', credentialProvider] }),
        queryClient.invalidateQueries({ queryKey: ['assistant-status'] }),
      ]);
    },
    onError: (error: Error) =>
      setCredentialMessage(error.message || 'Could not remove the saved API key'),
  });

  useEffect(() => {
    const current = query.data?.data;
    if (!current) return;
    const currentProvider = current.ai_provider;
    setProvider(
      currentProvider === 'anthropic' || currentProvider === 'groq' || currentProvider === 'ollama'
        ? currentProvider
        : 'openai',
    );
    setModel(current.ai_model || '');
    setEnabled(current.ai_enabled === 'true');
    setCloudConsent(current.ai_cloud_consent_provider === (current.ai_provider || 'openai'));
  }, [query.data]);

  if (query.isLoading) return <LoadingSpinner />;
  if (query.error)
    return <ErrorState message="Failed to load settings" onRetry={() => query.refetch()} />;

  const saved = query.data?.data ?? {};
  const savedProvider = saved.ai_provider || 'openai';
  const savedConsent = saved.ai_cloud_consent_provider === provider;
  const needsSave =
    provider !== savedProvider ||
    model !== (saved.ai_model || '') ||
    enabled !== (saved.ai_enabled === 'true') ||
    cloudConsent !== savedConsent;
  const destinationByProvider: Record<string, string> = {
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
    groq: 'https://api.groq.com',
    ollama: 'http://127.0.0.1:11434',
  };
  const configuredStatus = statusQuery.data?.data;
  const activeStatus =
    configuredStatus?.provider === provider &&
    configuredStatus.model === model &&
    configuredStatus.enabled === enabled &&
    configuredStatus.cloudConsent === (provider === 'ollama' || cloudConsent)
      ? configuredStatus
      : undefined;
  const displayedDestination = activeStatus?.destination ?? destinationByProvider[provider];
  const credentialSource = credentialQuery.data?.data?.source ?? null;

  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-medium text-on-surface">AI assistant</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          AI is optional and disabled by default. Add a provider key here, choose its model, save
          your preferences, and test the connection before starting a chat.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-on-surface-variant">
            Provider and destination
            <Select
              value={provider}
              disabled={saveCredentialMutation.isPending || removeCredentialMutation.isPending}
              onChange={(event) => {
                setProvider(event.target.value as typeof provider);
                setApiKey('');
                setCredentialMessage('');
                setCloudConsent(false);
                setTestMessage('Provider changed. Save and test the new destination.');
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (local)</option>
            </Select>
            <span className="mt-1 block font-mono text-[11px]">{displayedDestination}</span>
          </label>
          <label className="text-xs text-on-surface-variant">
            Model identifier
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              maxLength={100}
              placeholder="Enter a model available to this provider"
              required
            />
          </label>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-1 accent-primary-fixed-dim"
            />
            Enable AI analysis. Nothing is sent until you submit a question.
          </label>
          {provider !== 'ollama' && (
            <label className="flex items-start gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={cloudConsent}
                onChange={(event) => setCloudConsent(event.target.checked)}
                className="mt-1 accent-primary-fixed-dim"
              />
              <span>
                I consent to send my question, up to six recent chat messages, and the selected
                cloud provider minimum ledger context when I ask a question. Context may include
                dates, descriptions, merchants, categories, amounts, currencies, aggregate totals,
                and limited transaction references. Notes, database files, credentials, and
                unrelated records are excluded. I can withdraw consent here.
              </span>
            </label>
          )}
          {provider !== 'ollama' ? (
            <div className="rounded border border-outline-variant bg-surface-container-low p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium text-on-surface">Provider API key</h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Paste your{' '}
                  {provider === 'openai'
                    ? 'OpenAI'
                    : provider === 'anthropic'
                      ? 'Anthropic'
                      : 'Groq'}{' '}
                  API key here. It is stored in a private backend file, separate from your finance
                  database and backups. The key is never shown again after saving; paste a new key
                  to replace it.
                </p>
              </div>
              <label className="block text-xs text-on-surface-variant" htmlFor="assistant-api-key">
                {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Groq'}{' '}
                API key
                <Input
                  id="assistant-api-key"
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={saveCredentialMutation.isPending || removeCredentialMutation.isPending}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  maxLength={500}
                  placeholder={
                    credentialSource === 'settings'
                      ? 'Enter a replacement key'
                      : 'Paste your API key'
                  }
                  className="mt-1"
                />
              </label>
              <p className="text-xs text-on-surface-variant" role="status">
                {credentialQuery.isLoading
                  ? 'Checking key status…'
                  : credentialQuery.error
                    ? 'Key status is temporarily unavailable.'
                    : credentialSource === 'settings'
                      ? 'A key is saved in this app’s private credential file.'
                      : credentialSource === 'environment'
                        ? 'A server environment key is active. Saving here will take priority.'
                        : 'No API key is configured for this provider yet.'}
              </p>
              {credentialQuery.error && (
                <p className="text-xs text-error" role="alert">
                  Could not check the saved key status.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={
                    !apiKey.trim() ||
                    credentialQuery.isLoading ||
                    saveCredentialMutation.isPending ||
                    removeCredentialMutation.isPending
                  }
                  loading={saveCredentialMutation.isPending}
                  onClick={() => {
                    setCredentialMessage('');
                    saveCredentialMutation.mutate({ provider, apiKey: apiKey.trim() });
                  }}
                >
                  <Save className="h-4 w-4" />
                  {credentialSource === 'settings' ? 'Replace API key' : 'Save API key'}
                </Button>
                {credentialSource === 'settings' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saveCredentialMutation.isPending}
                    loading={removeCredentialMutation.isPending}
                    onClick={() => {
                      setApiKey('');
                      setCredentialMessage('');
                      removeCredentialMutation.mutate(provider);
                    }}
                  >
                    Remove saved key
                  </Button>
                )}
              </div>
              {credentialMessage && (
                <p role="status" className="text-sm text-on-surface-variant">
                  {credentialMessage}
                </p>
              )}
              <p className="text-xs text-on-surface-variant">
                Connection destinations are fixed by provider. Ollama uses its local API and does
                not need a key or cloud consent.
              </p>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">
              Ollama uses its local API and needs no API key or cloud consent. Its destination is
              restricted to localhost or the Docker host.
            </p>
          )}
          {activeStatus && (
            <div className="rounded border border-outline-variant bg-surface-container-low p-3 text-sm">
              <p className="font-medium text-on-surface">Connection: {activeStatus.state}</p>
              <p className="mt-1 text-on-surface-variant">{activeStatus.message}</p>
              {activeStatus.mode === 'cloud' && !activeStatus.cloudConsent && (
                <p className="mt-1 text-error">
                  Cloud consent is required before ledger context can be sent.
                </p>
              )}
              {activeStatus.provider === 'ollama' && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Server reachable:{' '}
                  {activeStatus.serverReachable === null
                    ? 'not checked'
                    : activeStatus.serverReachable
                      ? 'yes'
                      : 'no'}
                  {' · '}Model available:{' '}
                  {activeStatus.modelAvailable === null
                    ? 'not checked'
                    : activeStatus.modelAvailable
                      ? 'yes'
                      : 'no'}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p role="status" className="text-sm text-on-surface-variant">
                {message || testMessage}
              </p>
              {message && testMessage && (
                <p role="status" className="text-xs text-on-surface-variant">
                  {testMessage}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={needsSave || testMutation.isPending}
                loading={testMutation.isPending}
                onClick={() => {
                  setTestMessage('');
                  testMutation.mutate();
                }}
              >
                Test connection
              </Button>
              <Button
                size="sm"
                disabled={!model.trim()}
                loading={mutation.isPending}
                onClick={() => {
                  setMessage('');
                  setTestMessage('');
                  mutation.mutate({
                    ai_provider: provider,
                    ai_model: model.trim(),
                    ai_enabled: enabled,
                    ai_cloud_consent_provider:
                      provider !== 'ollama' && cloudConsent ? provider : null,
                  });
                }}
              >
                <Save className="h-4 w-4" /> Save preferences
              </Button>
            </div>
          </div>
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
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountType, setEditAccountType] = useState('bank');
  const [editAccountBalance, setEditAccountBalance] = useState('0');
  const [editAccountCurrency, setEditAccountCurrency] = useState('INR');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
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
    onSuccess: (_response, variables) => {
      setMessage(
        variables.active
          ? 'Account activated; its balance is included in Net Worth.'
          : 'Account deactivated; its balance is excluded from Net Worth. Transaction history is preserved.',
      );
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Could not update account'),
  });
  const saveAccount = useMutation({
    mutationFn: () => {
      if (!editingAccount) throw new Error('Choose an account to edit');
      return updateAccount(editingAccount.id, {
        name: editAccountName.trim(),
        type: editAccountType,
        balance: Number(editAccountBalance),
        currency: editAccountCurrency.trim().toUpperCase(),
      });
    },
    onSuccess: () => {
      setEditingAccount(null);
      setMessage('Account details and balance snapshot updated.');
      refresh();
    },
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
  const saveCategory = useMutation({
    mutationFn: () => {
      if (editingCategoryId === null) throw new Error('Choose a category to edit');
      return updateCategory(editingCategoryId, { name: editCategoryName.trim() });
    },
    onSuccess: () => {
      setEditingCategoryId(null);
      setMessage('Category renamed. Linked transactions and rules remain attached.');
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Could not rename category'),
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
                <li key={account.id} className="py-3 text-sm">
                  {editingAccount?.id === account.id ? (
                    <form
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setMessage('');
                        saveAccount.mutate();
                      }}
                    >
                      <Input
                        aria-label={`Edit ${account.name} account name`}
                        value={editAccountName}
                        onChange={(event) => setEditAccountName(event.target.value)}
                        maxLength={100}
                        required
                      />
                      <Select
                        aria-label={`Edit ${account.name} account type`}
                        value={editAccountType}
                        onChange={(event) => setEditAccountType(event.target.value)}
                      >
                        <option value="bank">Bank</option>
                        <option value="card">Card</option>
                        <option value="cash">Cash</option>
                        <option value="wallet">Wallet</option>
                        <option value="investment">Investment</option>
                      </Select>
                      <label className="text-xs text-on-surface-variant">
                        Currency code
                        <Input
                          aria-label={`Edit ${account.name} currency code`}
                          value={editAccountCurrency}
                          onChange={(event) =>
                            setEditAccountCurrency(event.target.value.toUpperCase())
                          }
                          maxLength={3}
                          pattern="[A-Z]{3}"
                          required
                        />
                      </label>
                      <label className="text-xs text-on-surface-variant">
                        Current balance snapshot ({editAccountCurrency || account.currency})
                        <Input
                          aria-label={`Edit ${account.name} balance snapshot`}
                          type="number"
                          step="0.01"
                          max="999999999999.99"
                          min="-999999999999.99"
                          value={editAccountBalance}
                          onChange={(event) => setEditAccountBalance(event.target.value)}
                          required
                        />
                      </label>
                      <div className="flex items-end gap-2">
                        <Button type="submit" size="sm" loading={saveAccount.isPending}>
                          <Save className="h-4 w-4" /> Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAccount(null)}
                        >
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                      <p className="sm:col-span-2 text-xs text-on-surface-variant">
                        Currency cannot change once transactions use this account. Deactivating an
                        account excludes its snapshot from Net Worth and keeps its transactions.
                      </p>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        {account.name} · {account.type} · {account.currency}{' '}
                        {Number(account.balance).toFixed(2)}
                        {account.is_active !== 1 && (
                          <span className="ml-2 text-xs text-on-surface-variant">Inactive</span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          aria-label={`Edit ${account.name} account`}
                          onClick={() => {
                            setEditingAccount(account);
                            setEditAccountName(account.name);
                            setEditAccountType(account.type);
                            setEditAccountBalance(String(account.balance));
                            setEditAccountCurrency(account.currency);
                            setMessage('');
                          }}
                          className="text-xs text-primary-fixed-dim underline"
                        >
                          Edit
                        </button>
                        <button
                          disabled={toggleAccount.isPending}
                          onClick={() =>
                            toggleAccount.mutate({ account, active: account.is_active !== 1 })
                          }
                          className="text-xs text-primary-fixed-dim underline disabled:opacity-50"
                        >
                          {account.is_active === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  )}
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
                <li key={category.id} className="py-2 text-sm">
                  {editingCategoryId === category.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setMessage('');
                        saveCategory.mutate();
                      }}
                    >
                      <Input
                        aria-label={`Rename ${category.name}`}
                        value={editCategoryName}
                        onChange={(event) => setEditCategoryName(event.target.value)}
                        maxLength={100}
                        required
                        autoFocus
                      />
                      <Button type="submit" size="sm" loading={saveCategory.isPending}>
                        <Save className="h-4 w-4" /> Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCategoryId(null)}
                      >
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                      <p className="basis-full text-xs text-on-surface-variant">
                        Renaming preserves links to historical transactions and categorization
                        rules.
                      </p>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {category.name}{' '}
                        <span className="text-xs text-on-surface-variant">{category.type}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          aria-label={`Rename category ${category.name}`}
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditCategoryName(category.name);
                          }}
                          className="text-xs text-primary-fixed-dim underline"
                        >
                          <Pencil className="inline h-3.5 w-3.5 mr-1" /> Rename
                        </button>
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
                      </div>
                    </div>
                  )}
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
