import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchAnalyticsSummary,
  fetchAnalyticsMonthly,
  fetchAnalyticsCategories,
  fetchTransactions,
  fetchUpcomingRecurring,
  fetchLargestExpenses,
} from '../services/endpoints';
import { Card, CardBody } from '../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../components/ui/States';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, Flame, Calendar } from 'lucide-react';
export default function Dashboard() {
  return (
    <div className="p-margin-desktop space-y-6">
      <SummaryCards />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CashFlowChart />
        <CategoryChart />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UpcomingRecurring />
        <LargestExpenses />
      </div>
      <RecentTransactions />
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function SummaryCards() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => fetchAnalyticsSummary(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load summary" onRetry={() => refetch()} />;
  }

  const s = data.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
      <SummaryCard
        label="Total Income"
        value={s.totalIncome}
        icon={ArrowUpRight}
        colorClass="text-primary-fixed-dim"
      />
      <SummaryCard
        label="Total Expenses"
        value={s.totalExpenses}
        icon={ArrowDownRight}
        colorClass="text-error"
      />
      <SummaryCard
        label="Net Savings"
        value={s.netSavings}
        icon={s.netSavings >= 0 ? TrendingUp : TrendingDown}
        colorClass={s.netSavings >= 0 ? 'text-primary-fixed-dim' : 'text-error'}
        subtitle={`${s.savingsRate}% savings rate`}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  colorClass,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-on-surface-variant uppercase tracking-widest">{label}</h3>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <p className={`text-2xl font-semibold font-mono ${colorClass} tabular-nums`}>
          {formatCurrency(value)}
        </p>
        {subtitle && <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>}
      </CardBody>
    </Card>
  );
}

function CashFlowChart() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => fetchAnalyticsMonthly({ months: 12 }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load cash flow data" onRetry={() => refetch()} />;
  }

  const chartData = data.data.map((d) => ({
    month: d.month.slice(5),
    Income: d.income,
    Expense: d.expense,
  }));

  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4">Cash Flow (12 months)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#3a4a43" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#b9cbc1" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#b9cbc1" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1c2d',
                  border: '1px solid #3a4a43',
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  color: '#d4e4fa',
                }}
              />
              <Line type="monotone" dataKey="Income" stroke="#00e1ab" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expense" stroke="#ffb4ab" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

function CategoryChart() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-categories', 'expense'],
    queryFn: () => fetchAnalyticsCategories({ type: 'expense' }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load categories" onRetry={() => refetch()} />;
  }

  const chartData = data.data
    .filter((c) => c.categoryName)
    .map((c) => ({
      name: c.categoryName!,
      amount: Math.abs(c.total),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4">Top Expense Categories</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid stroke="#3a4a43" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#b9cbc1" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#b9cbc1"
                tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1c2d',
                  border: '1px solid #3a4a43',
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  color: '#d4e4fa',
                }}
              />
              <Bar dataKey="amount" fill="#00e1ab" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

function RecentTransactions() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => fetchTransactions({ limit: 5, sortBy: 'date', sortOrder: 'desc' }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load transactions" onRetry={() => refetch()} />;
  }

  return (
    <Card>
      <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant/50">
        <h3 className="text-base font-medium text-on-surface">Recent Transactions</h3>
        <button
          onClick={() => navigate('/ledger')}
          className="text-primary-fixed-dim font-mono text-xs hover:underline flex items-center gap-1"
        >
          View All →
        </button>
      </div>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-surface border-b border-outline-variant">
            <th className="py-3 px-6 font-medium text-on-surface-variant text-xs uppercase tracking-wider">Date</th>
            <th className="py-3 px-6 font-medium text-on-surface-variant text-xs uppercase tracking-wider">Description</th>
            <th className="py-3 px-6 font-medium text-on-surface-variant text-xs uppercase tracking-wider">Category</th>
            <th className="py-3 px-6 font-medium text-on-surface-variant text-xs uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="font-mono text-sm divide-y divide-outline-variant/50">
          {data.data.map((tx) => (
            <tr key={tx.id} className="hover:bg-surface-container-high transition-colors">
              <td className="py-3 px-6 text-on-surface-variant">{tx.date}</td>
              <td className="py-3 px-6">{tx.description}</td>
              <td className="py-3 px-6">
                <span className="inline-block px-2 py-1 bg-surface-container-high border border-outline-variant rounded text-xs">
                  {tx.category_name || 'Uncategorized'}
                </span>
              </td>
              <td
                className={`py-3 px-6 text-right tabular-nums ${
                  tx.type === 'income' ? 'text-primary-fixed-dim' : 'text-error'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}
                {formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
          {data.data.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-on-surface-variant">
                No transactions yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function UpcomingRecurring() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['upcoming-recurring'],
    queryFn: () => fetchUpcomingRecurring(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load recurring data" onRetry={() => refetch()} />;
  }

  const items: Array<{ merchant: string; amount: number; frequency: string; lastDate: string }> = data.data;

  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-fixed-dim" />
          Upcoming Recurring
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-4">No recurring transactions detected</p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-outline-variant/30 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-mono text-on-surface">{item.merchant}</p>
                  <p className="text-xs text-on-surface-variant">{item.frequency} · last: {item.lastDate}</p>
                </div>
                <span className="text-sm font-mono text-error tabular-nums">
                  -{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
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

  if (isLoading) return <LoadingSpinner />;
  if (error || !data?.data) {
    return <ErrorState message="Failed to load expenses" onRetry={() => refetch()} />;
  }

  const items: Array<{ id: number; date: string; description: string; amount: number; categoryName: string | null }> = data.data;

  return (
    <Card>
      <CardBody>
        <h3 className="text-base font-medium text-on-surface mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-error" />
          Largest Expenses
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-4">No expenses recorded</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-outline-variant/30 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-mono text-on-surface">{item.description}</p>
                  <p className="text-xs text-on-surface-variant">{item.date} · {item.categoryName ?? 'Uncategorized'}</p>
                </div>
                <span className="text-sm font-mono text-error tabular-nums">
                  -{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
