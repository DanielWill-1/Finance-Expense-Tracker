import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CalendarDays, ChevronRight, Flame, Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState } from '../components/ui/States';
import {
  fetchAnalyticsCategories,
  fetchAnalyticsMonthly,
  fetchAnalyticsSummary,
  fetchLargestExpenses,
  fetchTransactions,
  fetchUpcomingRecurring,
} from '../services/endpoints';
import type { AnalyticsSummary, Transaction } from '../types/api';

interface AppLayoutContext {
  onAddTransaction: () => void;
}

type SummaryKey = 'totalIncome' | 'totalExpenses' | 'netSavings' | 'burnRate';
type Tone = 'positive' | 'negative' | 'neutral';

interface CurrencyAmount {
  currency: string;
  amount: number;
}

const chartColors = {
  income: 'var(--gl-accent)',
  expense: 'var(--gl-expense)',
  grid: 'var(--gl-border)',
  axis: 'var(--gl-muted)',
  text: 'var(--gl-text)',
  surface: 'var(--gl-surface)',
};

export default function Dashboard() {
  const { onAddTransaction } = useOutletContext<AppLayoutContext>();
  const summaryQuery = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => fetchAnalyticsSummary(),
  });
  const summary = summaryQuery.data?.data;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-5 pb-8 pt-7 sm:px-6 lg:space-y-9 lg:px-10 lg:pb-10 lg:pt-9">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-on-surface">Dashboard</h1>
        </div>
        <Button
          type="button"
          onClick={onAddTransaction}
          className="w-full sm:w-auto"
          aria-label="Add transaction"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Transaction
        </Button>
      </header>

      {summaryQuery.isLoading ? (
        <SummarySkeleton />
      ) : summaryQuery.error || !summary ? (
        <Card>
          <ErrorState message="Failed to load summary" onRetry={() => summaryQuery.refetch()} />
        </Card>
      ) : (
        <SummaryCards summary={summary} />
      )}

      <section
        aria-label="Cash flow and expense categories"
        className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]"
      >
        <CashFlowChart summary={summary} />
        <CategoryChart />
      </section>

      <RecentTransactions onAddTransaction={onAddTransaction} />

      <section aria-label="More spending details" className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <UpcomingRecurring />
        <LargestExpenses />
      </section>
    </div>
  );
}

function formatCurrency(value: number, currency = 'INR') {
  const safeValue = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${currency} ${safeValue.toFixed(2)}`;
  }
}

function formatAxisCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(date);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    date,
  );
}

function amountValues(summary: AnalyticsSummary, key: SummaryKey): CurrencyAmount[] {
  const currencies = summary.currencyTotals ?? [];
  if (currencies.length > 1) {
    return currencies.map((entry) => ({ currency: entry.currency, amount: entry[key] ?? 0 }));
  }

  const currency = currencies[0]?.currency ?? summary.netWorthByCurrency?.[0]?.currency ?? 'INR';
  const amount = summary[key] ?? currencies[0]?.[key] ?? 0;
  return [{ currency, amount }];
}

function netWorthValues(summary: AnalyticsSummary): CurrencyAmount[] {
  if (summary.netWorth === null) {
    const values = summary.netWorthByCurrency ?? [];
    return values.length > 0 ? values : [{ currency: 'INR', amount: 0 }];
  }

  return [
    {
      currency: summary.netWorthByCurrency?.[0]?.currency ?? summary.currencyTotals?.[0]?.currency ?? 'INR',
      amount: summary.netWorth,
    },
  ];
}

function amountTone(values: CurrencyAmount[]): Tone {
  if (values.length === 0) return 'neutral';
  if (values.every((value) => value.amount >= 0)) return 'positive';
  if (values.every((value) => value.amount < 0)) return 'negative';
  return 'neutral';
}

function toneClass(tone: Tone) {
  if (tone === 'positive') return 'text-primary-fixed-dim';
  if (tone === 'negative') return 'text-error';
  return 'text-on-surface';
}

function MoneyValues({
  values,
  tone = 'neutral',
  emphasized = false,
}: {
  values: CurrencyAmount[];
  tone?: Tone;
  emphasized?: boolean;
}) {
  const size = emphasized ? 'text-2xl lg:text-3xl' : 'text-[1.375rem] lg:text-[1.625rem]';
  return (
    <div className={`min-w-0 ${size} font-semibold leading-tight tracking-[-0.025em] tabular-nums ${toneClass(tone)}`}>
      {values.map((value) => (
        <span key={value.currency} className="block break-words">
          {formatCurrency(value.amount, value.currency)}
        </span>
      ))}
    </div>
  );
}

function SummaryCards({ summary }: { summary: AnalyticsSummary }) {
  const worth = netWorthValues(summary);
  const income = amountValues(summary, 'totalIncome');
  const expenses = amountValues(summary, 'totalExpenses');
  const savings = amountValues(summary, 'netSavings');

  return (
    <section aria-label="Financial overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Current Net Worth"
        values={worth}
        tone={amountTone(worth)}
        emphasized
        note="Account balance snapshots; transaction activity is separate."
        featured
      />
      <SummaryCard label="Total Income" values={income} tone="positive" />
      <SummaryCard label="Total Expenses" values={expenses} tone="negative" />
      <SummaryCard
        label="Net Savings"
        values={savings}
        tone={amountTone(savings)}
        note={
          summary.savingsRate === null ? undefined : `${summary.savingsRate.toFixed(2)}% savings rate`
        }
      />
    </section>
  );
}

function SummaryCard({
  label,
  values,
  tone,
  note,
  emphasized = false,
  featured = false,
}: {
  label: string;
  values: CurrencyAmount[];
  tone: Tone;
  note?: string;
  emphasized?: boolean;
  featured?: boolean;
}) {
  return (
    <Card className={featured ? 'border-primary-fixed-dim/25' : ''}>
      <CardBody className="flex h-full min-h-[142px] flex-col gap-5 px-5 py-5">
        <h2 className="text-sm font-medium text-on-surface-variant">{label}</h2>
        <div>
          <MoneyValues values={values} tone={tone} emphasized={emphasized} />
          {note && <p className="mt-2 max-w-[38ch] text-xs leading-5 text-on-surface-variant">{note}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <div aria-label="Loading financial summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item}>
          <CardBody className="min-h-[142px] animate-pulse px-5 py-5">
            <div className="h-4 w-28 rounded bg-surface-container-high" />
            <div className="mt-7 h-8 w-3/4 rounded bg-surface-container-high" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function PanelLoading({ title }: { title: string }) {
  return (
    <Card aria-label={`Loading ${title}`}>
      <CardBody className="min-h-[280px] animate-pulse">
        <div className="h-5 w-36 rounded bg-surface-container-high" />
        <div className="mt-8 h-48 rounded-lg bg-surface-container-low" />
      </CardBody>
    </Card>
  );
}

function CashFlowChart({ summary }: { summary?: AnalyticsSummary }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => fetchAnalyticsMonthly({ months: 12 }),
  });

  if (isLoading) return <PanelLoading title="cash flow" />;
  if (error || !data?.data) {
    return (
      <Card>
        <ErrorState message="Failed to load cash flow data" onRetry={() => refetch()} />
      </Card>
    );
  }

  const monthlyRows = (Array.isArray(data.data) ? data.data : []).filter(
    (row) => row && typeof row.month === 'string',
  );
  const currencyRows = [...new Set(monthlyRows.map((row) => row.currency ?? 'INR'))].sort();
  const chartMaps = new Map<string, Map<string, Record<string, string | number>>>();

  for (const row of monthlyRows) {
    const currency = row.currency ?? 'INR';
    const rowsByMonth = chartMaps.get(currency) ?? new Map<string, Record<string, string | number>>();
    const chartRow = rowsByMonth.get(row.month) ?? { month: row.month };
    chartRow[`Income ${currency}`] = Number.isFinite(row.income) ? row.income : 0;
    chartRow[`Expense ${currency}`] = Number.isFinite(row.expense) ? row.expense : 0;
    rowsByMonth.set(row.month, chartRow);
    chartMaps.set(currency, rowsByMonth);
  }

  if (currencyRows.length === 0) {
    return (
      <Card>
        <CardBody>
          <SectionHeading title="Cash flow" description="Monthly income and expenses · last 12 months" />
          <EmptyMessage title="No transaction data yet" description="Cash flow will appear here after you add or import activity." />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-5 ${currencyRows.length > 1 ? '2xl:grid-cols-2' : ''}`}>
      {currencyRows.map((currency) => {
        const chartData = [...(chartMaps.get(currency)?.values() ?? [])].sort((a, b) =>
          String(a.month).localeCompare(String(b.month)),
        );
        const burn = burnRateFor(summary, currency);

        return (
          <Card key={currency} className="min-w-0">
            <CardBody className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  title="Cash flow"
                  description={`${currency} · Monthly income and expenses · last 12 months`}
                />
                {burn && (
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-on-surface-variant">Monthly burn · 6 full months</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-on-surface">{burn}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
                <LegendItem colorClass="bg-primary-fixed-dim" label="Income" />
                <LegendItem colorClass="bg-error" label="Expenses" />
              </div>

              <div
                role="img"
                aria-label={`Monthly income and expenses in ${currency} for the last 12 months`}
                className="mt-3 h-[250px] min-w-0 sm:h-[290px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 12, right: 10, left: 2, bottom: 2 }} accessibilityLayer>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      interval="preserveStartEnd"
                      minTickGap={16}
                      tick={{ fill: chartColors.axis, fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      width={70}
                      tickFormatter={(value: number) => formatAxisCurrency(value, currency)}
                      tick={{ fill: chartColors.axis, fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                      tickLine={false}
                      axisLine={false}
                      dx={-2}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatMonth(String(value))}
                      formatter={(value, name) => [formatCurrency(Number(value), currency), String(name)]}
                      contentStyle={{
                        backgroundColor: chartColors.surface,
                        border: `1px solid ${chartColors.grid}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                        color: chartColors.text,
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: chartColors.axis, marginBottom: '6px' }}
                      cursor={{ stroke: chartColors.grid, strokeDasharray: '3 4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={`Income ${currency}`}
                      name="Income"
                      stroke={chartColors.income}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColors.surface, stroke: chartColors.income, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={`Expense ${currency}`}
                      name="Expenses"
                      stroke={chartColors.expense}
                      strokeWidth={2.25}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColors.surface, stroke: chartColors.expense, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="sr-only">
                <table>
                  <caption>Monthly cash flow values in {currency}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">Income</th>
                      <th scope="col">Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={String(row.month)}>
                        <th scope="row">{formatMonth(String(row.month))}</th>
                        <td>{formatCurrency(Number(row[`Income ${currency}`] ?? 0), currency)}</td>
                        <td>{formatCurrency(Number(row[`Expense ${currency}`] ?? 0), currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function burnRateFor(summary: AnalyticsSummary | undefined, currency: string) {
  if (!summary) return null;
  const totals = summary.currencyTotals ?? [];
  const currencyTotal = totals.find((item) => item.currency === currency);
  const value = totals.length > 1 ? currencyTotal?.burnRate : (currencyTotal?.burnRate ?? summary.burnRate);
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return formatCurrency(value, currency);
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`h-0.5 w-4 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

function CategoryChart() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-categories', 'expense'],
    queryFn: () => fetchAnalyticsCategories({ type: 'expense' }),
  });

  if (isLoading) return <PanelLoading title="expense categories" />;
  if (error || !data?.data) {
    return (
      <Card>
        <ErrorState message="Failed to load categories" onRetry={() => refetch()} />
      </Card>
    );
  }

  const categoriesByCurrency = new Map<string, Array<{ name: string; amount: number }>>();
  for (const category of Array.isArray(data.data) ? data.data : []) {
    const currency = category.currency ?? 'INR';
    const categories = categoriesByCurrency.get(currency) ?? [];
    categories.push({
      name: category.categoryName ?? 'Uncategorized',
      amount: Number.isFinite(category.total) ? Math.abs(category.total) : 0,
    });
    categoriesByCurrency.set(currency, categories);
  }

  const currencies = [...categoriesByCurrency.keys()].sort();
  if (currencies.length === 0) {
    return (
      <Card>
        <CardBody>
          <SectionHeading title="Top expense categories" description="Grouped by currency" />
          <EmptyMessage title="No expense data yet" />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-5 ${currencies.length > 1 ? '2xl:grid-cols-2' : ''}`}>
      {currencies.map((currency) => {
        const chartData = [...(categoriesByCurrency.get(currency) ?? [])]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6);

        return (
          <Card key={currency} className="min-w-0">
            <CardBody className="px-5 py-5 sm:px-6 sm:py-6">
              <SectionHeading title="Top expense categories" description={`Spending in ${currency}`} />
              <div role="img" aria-label={`Top expense categories in ${currency}`} className="mt-4 h-[250px] min-w-0 sm:h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 6, right: 10, left: 0, bottom: 2 }}
                    accessibilityLayer
                  >
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 6" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value: number) => formatAxisCurrency(value, currency)}
                      tick={{ fill: chartColors.axis, fontSize: 10, fontFamily: 'Inter, system-ui, sans-serif' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fill: chartColors.axis, fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value), currency), 'Expenses']}
                      contentStyle={{
                        backgroundColor: chartColors.surface,
                        border: `1px solid ${chartColors.grid}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                        color: chartColors.text,
                        fontSize: '12px',
                      }}
                      cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }}
                    />
                    <Bar
                      dataKey="amount"
                      name="Expenses"
                      fill={chartColors.expense}
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function RecentTransactions({ onAddTransaction }: { onAddTransaction: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => fetchTransactions({ limit: 5, sortBy: 'date', sortOrder: 'desc' }),
  });

  if (isLoading) return <PanelLoading title="recent transactions" />;
  if (error || !data?.data) {
    return (
      <Card>
        <ErrorState message="Failed to load transactions" onRetry={() => refetch()} />
      </Card>
    );
  }

  const transactions = data.data;
  return (
    <Card className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-outline-variant px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Recent transactions</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Your latest activity</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ledger')}
          className="inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-2 text-sm font-medium text-primary-fixed-dim transition-colors hover:bg-primary-fixed-dim/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim sm:self-auto"
        >
          View ledger
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <EmptyMessage
            title="No transactions yet"
            description="Add an entry to start seeing your recent activity here."
          />
          <Button type="button" variant="outline" onClick={onAddTransaction} className="mt-5">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Five most recent transactions</caption>
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/70">
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-on-surface-variant">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-on-surface-variant">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-on-surface-variant">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-on-surface-variant">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/80">
                {transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-outline-variant/80 md:hidden">
            {transactions.map((transaction) => (
              <MobileTransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const positive = transaction.type === 'income';
  const currency = transaction.account_currency ?? 'INR';
  return (
    <tr className="transition-colors hover:bg-surface-container-low/70">
      <td className="whitespace-nowrap px-6 py-4 text-on-surface-variant">{formatDate(transaction.date)}</td>
      <td className="max-w-[32rem] break-words px-6 py-4 font-medium text-on-surface">
        {transaction.description}
      </td>
      <td className="px-6 py-4 text-on-surface-variant">{transaction.category_name || 'Uncategorized'}</td>
      <td className={`whitespace-nowrap px-6 py-4 text-right font-medium tabular-nums ${positive ? 'text-primary-fixed-dim' : 'text-error'}`}>
        {positive ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount), currency)}
      </td>
    </tr>
  );
}

function MobileTransactionRow({ transaction }: { transaction: Transaction }) {
  const positive = transaction.type === 'income';
  const currency = transaction.account_currency ?? 'INR';
  return (
    <li className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <time className="text-xs text-on-surface-variant" dateTime={transaction.date}>
          {formatDate(transaction.date)}
        </time>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${positive ? 'text-primary-fixed-dim' : 'text-error'}`}>
          {positive ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount), currency)}
        </span>
      </div>
      <p className="mt-2 whitespace-normal break-words text-sm font-medium text-on-surface">
        {transaction.description}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{transaction.category_name || 'Uncategorized'}</p>
    </li>
  );
}

function UpcomingRecurring() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['upcoming-recurring'],
    queryFn: () => fetchUpcomingRecurring(),
  });

  if (isLoading) return <PanelLoading title="upcoming recurring" />;
  if (error || !data?.data) {
    return (
      <Card>
        <ErrorState message="Failed to load recurring data" onRetry={() => refetch()} />
      </Card>
    );
  }

  const items = Array.isArray(data.data)
    ? (data.data as Array<{
        merchant: string;
        amount: number;
        currency?: string;
        frequency: string;
        lastDate: string;
        nextDueDate?: string;
        forecastBasis?: string;
      }>)
    : [];

  return (
    <Card>
      <CardBody className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-fixed-dim" />
          <SectionHeading title="Upcoming recurring" description="Forecasts based on recent activity" />
        </div>
        {items.length === 0 ? (
          <EmptyMessage title="No recurring transactions detected" />
        ) : (
          <ul className="mt-5 divide-y divide-outline-variant/80">
            {items.slice(0, 6).map((item) => (
              <li key={`${item.merchant}-${item.lastDate}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-on-surface">{item.merchant}</p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    Est. due {item.nextDueDate ? formatDate(item.nextDueDate) : 'soon'} ·{' '}
                    {item.forecastBasis ?? `${item.frequency}; last: ${formatDate(item.lastDate)}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-error">
                  −{formatCurrency(item.amount, item.currency ?? 'INR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function LargestExpenses() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['largest-expenses'],
    queryFn: () => fetchLargestExpenses({ limit: 6 }),
  });

  if (isLoading) return <PanelLoading title="largest expenses" />;
  if (error || !data?.data) {
    return (
      <Card>
        <ErrorState message="Failed to load expenses" onRetry={() => refetch()} />
      </Card>
    );
  }

  const items = Array.isArray(data.data)
    ? (data.data as Array<{
        id: number;
        date: string;
        description: string;
        amount: number;
        currency?: string;
        categoryName: string | null;
      }>)
    : [];

  return (
    <Card>
      <CardBody className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <Flame aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <SectionHeading title="Largest expenses" description="By currency" />
        </div>
        {items.length === 0 ? (
          <EmptyMessage title="No expenses recorded" />
        ) : (
          <ul className="mt-5 divide-y divide-outline-variant/80">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-on-surface">{item.description}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {formatDate(item.date)} · {item.categoryName ?? 'Uncategorized'}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-error">
                  −{formatCurrency(item.amount, item.currency ?? 'INR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-on-surface">{title}</h2>
      {description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>}
    </div>
  );
}

function EmptyMessage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-on-surface">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-[36ch] text-sm leading-6 text-on-surface-variant">{description}</p>}
    </div>
  );
}
