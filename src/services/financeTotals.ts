import { ExpenseRecord, JobRecord } from '../types';

export interface FinanceTotals {
  totalIncome: number;
  totalExpenses: number;
  salaryExpenses: number;
  operatingExpenses: number;
  netProfit: number;
}

export function calculateFinanceTotals(
  jobs: JobRecord[],
  expenses: ExpenseRecord[]
): FinanceTotals {
  const totalIncome = jobs.reduce(
    (sum, job) => sum + (job.payments || []).reduce((paid, payment) => paid + payment.amount, 0),
    0
  );
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const salaryExpenses = expenses
    .filter((expense) => expense.category === 'Salary')
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    salaryExpenses,
    operatingExpenses: totalExpenses - salaryExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}
