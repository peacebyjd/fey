import React, { useEffect, useMemo, useState } from 'react';
import { JobRecord } from '../../types';
import { StorageService } from '../../services/storage';
import { calculateFinanceTotals } from '../../services/financeTotals';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface FinanceOverviewProps {
  jobs: JobRecord[];
}

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({ jobs }) => {
  const settings = StorageService.getSettings();
  const [expenses, setExpenses] = useState(() => StorageService.getExpenses());

  useEffect(() => {
    setExpenses(StorageService.getExpenses());
    return StorageService.subscribe(() => setExpenses(StorageService.getExpenses()));
  }, []);

  const payments = useMemo(
    () =>
      jobs.flatMap((job) =>
        (job.payments || []).map((payment) => ({
          ...payment,
          jobNumber: job.jobNumber,
          plateNumber: job.plateNumber,
          customerName: job.customerName,
        }))
      ),
    [jobs]
  );

  const { totalIncome, totalExpenses, salaryExpenses, operatingExpenses, netProfit } =
    calculateFinanceTotals(jobs, expenses);

  const maxBar = Math.max(totalIncome, totalExpenses, 1);
  const incomeWidth = Math.round((totalIncome / maxBar) * 100);
  const expenseWidth = Math.round((totalExpenses / maxBar) * 100);

  const recent = useMemo(() => {
    const incomeRows = payments.map((payment) => ({
      id: `income-${payment.id}`,
      date: payment.date,
      title: `Payment - ${payment.customerName}`,
      subtitle: `${payment.jobNumber} / ${payment.plateNumber}`,
      amount: payment.amount,
      kind: 'income' as const,
    }));
    const expenseRows = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.date,
      title: expense.description,
      subtitle: expense.category,
      amount: expense.amount,
      kind: 'expense' as const,
    }));
    return [...incomeRows, ...expenseRows]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [payments, expenses]);

  const money = (value: number) =>
    `${settings.currency} ${Math.round(value).toLocaleString()}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
              Total Income
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {money(totalIncome)}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">All job payments collected</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
              Total Expenses
            </span>
            <span className="w-8 h-8 rounded-lg bg-coral/10 text-coral flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-coral tabular-nums mt-1">
            {money(totalExpenses)}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            Salaries {money(salaryExpenses)} · Other {money(operatingExpenses)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-line shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
              Net Profit
            </span>
            <span className="w-8 h-8 rounded-lg bg-sand text-brand flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p
            className={`text-2xl font-bold tabular-nums mt-1 ${
              netProfit >= 0 ? 'text-ink' : 'text-coral'
            }`}
          >
            {money(netProfit)}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">Income minus all expenses</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">Income vs Expenses</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-ink-muted">Income</span>
                <span className="font-mono text-emerald-700">{money(totalIncome)}</span>
              </div>
              <div className="h-3 rounded-full bg-sand overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${incomeWidth}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-ink-muted">Expenses</span>
                <span className="font-mono text-coral">{money(totalExpenses)}</span>
              </div>
              <div className="h-3 rounded-full bg-sand overflow-hidden">
                <div className="h-full bg-coral" style={{ width: `${expenseWidth}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2.5 rounded-xl bg-sand/40 border border-line">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-muted uppercase">
                <Banknote className="w-3.5 h-3.5" /> Salary paid
              </div>
              <p className="font-mono font-bold text-ink text-sm mt-0.5">{money(salaryExpenses)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sand/40 border border-line">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-muted uppercase">
                <ReceiptText className="w-3.5 h-3.5" /> Other expenses
              </div>
              <p className="font-mono font-bold text-ink text-sm mt-0.5">{money(operatingExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Recent money movement</h3>
            <span className="text-[10px] text-ink-muted">{recent.length} entries</span>
          </div>
          <div className="divide-y divide-line max-h-[290px] overflow-y-auto smooth-scroll">
            {recent.map((row) => (
              <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{row.title}</p>
                  <p className="text-[10px] text-ink-muted truncate">
                    {row.date} · {row.subtitle}
                  </p>
                </div>
                <span
                  className={`font-mono text-xs font-bold shrink-0 ${
                    row.kind === 'income' ? 'text-emerald-700' : 'text-coral'
                  }`}
                >
                  {row.kind === 'income' ? '+' : '-'}
                  {Math.round(row.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="p-6 text-center text-xs text-ink-muted">
                No payments or expenses recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
