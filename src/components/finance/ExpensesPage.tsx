import React, { useEffect, useMemo, useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExpenseRecord,
  User,
} from '../../types';
import { StorageService } from '../../services/storage';
import { canManagePricing } from '../../services/permissions';
import { dateKey } from '../../services/payroll';
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

interface ExpensesPageProps {
  currentUser: User;
}

const categoryBadge = (category: ExpenseCategory) => {
  if (category === 'Salary') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  if (category === 'Material') return 'bg-sky-50 text-sky-800 border-sky-300';
  if (category === 'Utilities') return 'bg-amber-100 text-amber-800 border-amber-300';
  if (category === 'Rent') return 'bg-purple-50 text-purple-800 border-purple-300';
  return 'bg-sand text-ink-muted border-line';
};

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ currentUser }) => {
  const settings = StorageService.getSettings();
  const canManage = canManagePricing(currentUser.role);

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => StorageService.getExpenses());
  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setExpenses(StorageService.getExpenses());
    refresh();
    return StorageService.subscribe(refresh);
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return expenses
      .filter((expense) => categoryFilter === 'All' || expense.category === categoryFilter)
      .filter(
        (expense) =>
          !query ||
          expense.description.toLowerCase().includes(query) ||
          (expense.workerName || '').toLowerCase().includes(query) ||
          expense.createdBy.toLowerCase().includes(query)
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [expenses, categoryFilter, search]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const salaryTotal = expenses
    .filter((expense) => expense.category === 'Salary')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const monthKey = dateKey().substring(0, 7);
  const monthTotal = expenses
    .filter((expense) => expense.date.startsWith(monthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const money = (value: number) =>
    `${settings.currency} ${Math.round(value).toLocaleString()}`;

  const handleDelete = (expense: ExpenseRecord) => {
    if (expense.source === 'salary') {
      flash('Salary expenses are reversed from the Salary page.');
      return;
    }
    if (!confirm(`Delete expense "${expense.description}"?`)) return;
    if (StorageService.deleteExpense(expense.id)) {
      flash('Expense deleted.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-ink">Expenses</h2>
              <p className="text-[11px] text-ink-muted">
                Salary payments are added automatically. Record all other costs here.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add expense
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
          <div className="p-3 rounded-xl bg-coral/10 border border-coral/30">
            <p className="text-[10px] font-semibold text-brand uppercase tracking-wide">Total expenses</p>
            <p className="text-lg font-bold text-brand tabular-nums">{money(total)}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Paid salaries</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums">{money(salaryTotal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-sand/40 border border-line">
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">This month</p>
            <p className="text-lg font-bold text-ink tabular-nums">{money(monthTotal)}</p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {notice}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-line">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {(['All', ...EXPENSE_CATEGORIES] as const).map((category) => {
            const count =
              category === 'All'
                ? expenses.length
                : expenses.filter((expense) => expense.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  categoryFilter === category
                    ? 'bg-brand text-white'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span>{category === 'All' ? 'All' : category}</span>
                <span
                  className={`px-1.5 rounded-full text-[10px] font-mono ${
                    categoryFilter === category ? 'bg-white/20' : 'bg-sand'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted/70" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search expenses"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-sand/50 border-b border-line text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          <span className="col-span-2">Date</span>
          <span className="col-span-2">Category</span>
          <span className="col-span-4">Description</span>
          <span className="col-span-2">Source</span>
          <span className="col-span-2 text-right">Amount ({settings.currency})</span>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((expense) => (
            <div
              key={expense.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 px-4 py-3 items-center"
            >
              <div className="md:col-span-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <CalendarDays className="w-3.5 h-3.5" />
                {expense.date}
              </div>
              <div className="md:col-span-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${categoryBadge(
                    expense.category
                  )}`}
                >
                  {expense.category}
                </span>
              </div>
              <div className="md:col-span-4 min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{expense.description}</p>
                <p className="text-[10px] text-ink-muted truncate">
                  By {expense.createdBy}
                  {expense.workerName ? ` · ${expense.workerName}` : ''}
                </p>
              </div>
              <div className="md:col-span-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    expense.source === 'salary'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-sand text-ink-muted'
                  }`}
                >
                  {expense.source === 'salary' ? 'Auto salary' : 'Manual'}
                </span>
              </div>
              <div className="md:col-span-2 flex items-center md:justify-end gap-1.5">
                <span className="font-mono text-xs font-bold text-coral">
                  {money(expense.amount)}
                </span>
                {canManage && expense.source === 'manual' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(expense)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-line text-coral hover:bg-coral/10 cursor-pointer"
                    title="Delete expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-ink-muted">
              <Wallet className="w-7 h-7 mx-auto text-line mb-2" />
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ExpenseModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            flash('Expense recorded.');
          }}
          createdBy={currentUser.name}
        />
      )}
    </div>
  );
};

const ExpenseModal: React.FC<{
  onClose: () => void;
  onSaved: () => void;
  createdBy: string;
}> = ({ onClose, onSaved, createdBy }) => {
  const settings = StorageService.getSettings();
  const [category, setCategory] = useState<ExpenseCategory>('Material');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dateKey());
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!description.trim()) {
      setError('Enter what this expense was for.');
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const saved = StorageService.addExpense({
      category,
      description,
      amount: value,
      date,
      createdBy,
    });
    if (!saved) {
      setError('Could not save this expense.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-line">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Add expense</h3>
            <p className="text-[11px] text-ink-muted">Record a cost in {settings.currency}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {error && (
            <div className="text-coral bg-coral/10 border border-coral/30 rounded-lg px-2.5 py-1.5">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-ink mb-0.5">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                className="w-full px-2.5 py-2 bg-cream border border-line rounded-lg"
              >
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-ink mb-0.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full px-2.5 py-2 bg-cream border border-line rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">
              Description
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Brake pads from supplier"
              className="w-full px-2.5 py-2 bg-cream border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-ink mb-0.5">
              Amount ({settings.currency})
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full px-2.5 py-2 font-mono bg-cream border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-white border border-line rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
};
