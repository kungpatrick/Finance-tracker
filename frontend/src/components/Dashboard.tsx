import React, { useMemo, useState, useEffect } from 'react';
import { useTransactions, type Transaction } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from './Navbar';
import { TransactionForm } from './TransactionForm'; // Keep this import
import { CategoryBarChart } from './CategoryBarChart'; // Import the new Bar Chart
import { CumulativeSpendingIncomeChart } from './CumulativeSpendingIncomeChart';
import { SpendingTrendChart } from './SpendingTrendChart';
import { CsvImportModal } from './CsvImportModal';
import Papa from 'papaparse';
import { SummaryCards } from './SummaryCards';
import { BudgetTracker } from './BudgetTracker';
import { SavingsGoals, type Goal } from './SavingsGoals';
import { LiabilitiesAndDebts, type Debt } from './LiabilitiesAndDebts';
import { FinancialActionModal, type ActionType } from './FinancialActionModal';
import { AmortizationModal } from './AmortizationModal';
import { useGoals } from '../hooks/useGoals';
import { useDebts } from '../hooks/useDebts';
import { useRecurringRules } from '../hooks/useRecurringRules';
import { RecurringRulesModal } from './RecurringRulesModal';
import { ReceiptModal } from './ReceiptModal';
import { useAccounts, type Account } from '../hooks/useAccounts';
import { AddAccountModal } from './AddAccountModal';
import { useCategories } from '../hooks/useCategories';
import { CategoryManagementModal } from './CategoryManagementModal';
import { NetWorthTrendChart } from './NetWorthTrendChart';
import { useTransactionRules } from '../hooks/useTransactionRules';
import { TransactionRulesModal } from './TransactionRulesModal';
import { ProactiveIntelligence } from './ProactiveIntelligence';
import { WealthProjectionCard } from './WealthProjectionCard';
import { TagBreakdownChart } from './TagBreakdownChart';
import { TransactionTable } from './TransactionTable';
import { WealthVelocityChart } from './WealthVelocityChart';
import { MerchantInsights } from './MerchantInsights';
import { AccountSection } from './AccountSection';
import { FinancialHealthRadar } from './FinancialHealthRadar';
import { AIAssistant } from './AIAssistant';
import { normalizeDescription } from '../utils/stringUtils'; // Import from utility file

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { budgets, upsertBudget } = useBudgets();
  const { 
    transactions
    error, 
    refresh: refreshTransactions, 
    addTransaction, 
    getPublicUrl, 
    deleteTransaction, 
    updateTransaction,
    bulkDeleteTransactions,
    bulkUpdateTransactionStatus
  } = useTransactions();
  const { goals, addGoal, fundGoal, updateGoal, deleteGoal, refreshGoals } = useGoals(); // Get refreshGoals
  coeb,b
  const { rules: transactionRules, applyRules } = useTransactionRules();
  const { accounts, deleteAccount, refreshAccounts } = useAccounts();
  const { categories: customCategories } = useCategories();

  const pendingBillsCount = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    return rules.filter(r => r.last_processed_month !== currentMonth).length;
  }, [rules]);

  // Combined refresh function to keep accounts and transactions in sync
  const refreshAllData = React.useCallback(async () => {
    await refreshTransactions();
    await refreshAccounts();
    await refreshGoals(); // Refresh goals
    await refreshDebts(); // Refresh debts
    await refreshRules(); // Refresh recurring rules
  }, [refreshTransactions, refreshAccounts, refreshGoals, refreshDebts, refreshRules]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<
    (Account & { hasTransactions?: boolean }) | null
  >(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // For TransactionForm
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<{id: string, receipt?: string | null, recurring_rule_id?: string | null} | null>(null);

  // Handle intermittent 401 Unauthorized errors by auto-refreshing once the session is stable
  useEffect(() => {
    if (error && user && (error.toString().includes('401') || error.toString().toLowerCase().includes('unauthorized'))) {
      refreshAllData();
    }
  }, [error, user, refreshAllData]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>({ 
    key: 'transaction_date', 
    direction: 'desc' 
  });

  // Auto-check for recurring bills on load
  useEffect(() => {
    if (!loading && rules.length > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const pending = rules.some(r => r.last_processed_month !== currentMonth);
      if (pending) {
        console.log("Note: You have pending recurring transactions to process.");
      }
    }
  }, [loading, rules]);

  // Financial Modals State
  const [financialModal, setFinancialModal] = useState<{ 
    type: ActionType; 
    title: string; 
    contextName?: string; 
    initialData?: any; 
  } | null>(null);
  const [selectedAmortization, setSelectedAmortization] = useState<Debt | null>(null);
  
  // Reporting View State
  const [viewType, setViewType] = useState<'custom' | 'monthly' | 'lastMonth' | 'quarterly' | 'ytd'>('custom');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Chart Tab State
  const [activeTab, setActiveTab] = useState<'trends' | 'categories' | 'cumulative' | 'networth' | 'merchants' | 'velocity' | 'health'>('trends');

  const handleQuickRange = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'all') => {
    const now = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
      setViewType('custom');
    } else if (type === 'thisMonth') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
      setViewType('monthly');
    } else if (type === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDate(lastDayLastMonth.toISOString().split('T')[0]);
      setViewType('lastMonth');
    } else if (type === 'last30') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      setViewType('custom');
    }
  };

  const categories = useMemo(() => {
    const usedCategories = new Set(transactions.map(t => t.category));
    const customNames = customCategories.map(c => c.name);
    const combined = new Set([...customNames, ...usedCategories]);
    return Array.from(combined).sort();
  }, [transactions, customCategories]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        t.description.toLowerCase().includes(searchLower) || 
        (t.notes?.toLowerCase().includes(searchLower)) ||
        (t.tags?.some(tag => tag.toLowerCase().includes(searchLower)));
        
      coest matchesType = selectedType === 'All' || t.typctedAccountId || t.to_account_id === selectedAccountId;
      
      const tDate = t.transaction_date || '';
      const matchesStartDate = !startDate || tDate >= startDate;
      const matchesEndDate = !endDate || tDate <= endDate;
      return matchesSearch && matchesCategory && matchesType && matchesAccount && matchesStartDate && matchesEndDate;
    });
  }, [transactions, searchTerm, selectedCategory, selectedType, selectedAccountId, startDate, endDate]);

  const comparisonTransactions = useMemo(() => {
    // Only calculate comparison if we are in a specific monthly view
    if ((viewType !== 'monthly' && viewType !== 'lastMonth') || !startDate) return [];
    
    const currentStart = new Date(startDate);
    const prevMonthStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    const prevMonthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
    
    // Safe ISO string conversion
    const startStr = prevMonthStart.toISOString().split('T')[0];
    const endStr = prevMonthEnd.toISOString().split('T')[0];

    return transactions.filter(t => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const inRange = (t.transaction_date || '') >= startStr && (t.transaction_date || '') <= endStr;
      return matchesCategory && inRange;
    });
  }, [transactions, viewType, startDate, selectedCategory]);

  const sortedTransactions = useMemo(() => {
    const sortableItems = [...filteredTransactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const modifier = sortConfig.direction === 'asc' ? 1 : -1;
        return aValue < bValue ? -1 * modifier : 1 * modifier;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig]);

  const categoryData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        // If transaction is split, use split amounts. Otherwise use main amount.
        if (t.splits && t.splits.length > 0) {
          t.splits.forEach((s: any) => {
            const cat = s.category || 'General';
            dataMap[cat] = (dataMap[cat] || 0) + (Number(s.amount) || 0);
          });
        } else {
          dataMap[t.category] = (dataMap[t.category] || 0) + (Number(t.amount) || 0);
        }
      });

    const budgetCategories = budgets.map(b => b.category);
    const allCategories = Array.from(new Set([...Object.keys(dataMap), ...budgetCategories]));

    return allCategories.map(category => ({
      name: category,
      spent: Number((dataMap[category] || 0).toFixed(2)),
      limit: budgets.find(b => b.category === category)?.limit_amount || 0,
      color: customCategories.find(c => c.name === category)?.color
    }));
  }, [filteredTransactions, budgets, customCategories]);

  const totalSpending = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
  };

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDuplicateTransaction = async (t: Transaction) => {
    if (!user?.id) return;
    
    // Create a copy with the current date
    const { success } = await addTransaction({
      description: t.description,
      amount: t.amount,
      category: t.category,
      type: t.type,
      transaction_date: new Date().toISOString().split('T')[0],
      user_id: user.id,
      account_id: t.account_id,
      notes: t.notes ? `[Clone] ${t.notes}` : undefined
    });
    if (success) refreshAllData();
  };
  const handleUpdateStatus = (id: string, is_reconciled: boolean) => {
    updateTransaction(id, { is_reconciled });
  };

  const handleBulkDelete = async (ids: string[]) => {
    // 1. Identify affected recurring rules before deletion
    const affectedTransactions = transactions.filter(t => ids.includ= actions.map(t => t.recurring_rule_id).filter(Boolean) as string[])];

    const result = await bulkDeleteTransactions(ids);
    if (result.success) {
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      
      // 2. For each rule, check if any transactions REMAIN for this month
      for (const ruleId of ruleIdsToCheck) {
        const remaining = transactions.filter(t => 
          t.recurring_rule_id === ruleId && 
          (t.transaction_date || '').startsWith(currentMonth.slice(0, 7)) &&
          !ids.includes(t.id)
        );
        
        if (remaining.length === 0) await unmarkAsProcessed(ruleId);
      }
      refreshAllData();
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], is_reconciled: boolean) => {
    const result = await bulkUpdateTransactionStatus(ids, is_reconciled);
    if (result.success) refreshAllData();
  };

  const handleDeleteTransactionAndUnmarkRule = async (id: string, receipt?: string | null, recurringRuleId?: string | null) => {
    const result = await deleteTransaction(id, receipt);
    if (result.success && recurringRuleId) { // Use the passed recurringRuleId
      // Check if there are any other transactions for this rule in the current month
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const otherTransactionsForRule = transactions.filter(t => 
        t.recurring_rule_id === recurringRuleId && 
        (t.transaction_date || '').startsWith(currentMonth) && 
        t.id !== id // Exclude the one just deleted
      );
      if (otherTransactionsForRule.length === 0) { // Only unmark if this was the last one
        if (typeof unmarkAsProcessed === 'function') {
          await unmarkAsProcessed(recurringRuleId);
        }
      }
    }
    refreshAllData();
  };

  const totalSavings = useMemo(() => goals.reduce((acc, g) => acc + (Number(g.current_amount) || 0), 0), [goals]);
  const totalDebt = useMemo(() => debts.reduce((acc, d) => acc + (Number(d.remaining_amount) || 0), 0), [debts]);
  
  // Unified Home Currency Calculation (Normalizing to USD)
  const totalAccountBalance = useMemo(() => {
    // Note: For production, consider fetching these rates from an API
    // to ensure user balances are accurate.
    const rates: Record<string, number> = { 
      USD: 1, EUR: 1.09, GBP: 1.27, CAD: 0.74, AUD: 0.66, JPY: 0.0067, CNY: 0.14 
    };
    
    return accounts.reduce((sum, acc) => {
      const rate = rates[acc.currency] || 1;
      const balanceInHomeCurrency = Number(acc.balance) * rate;
      return sum + (acc.type === 'credit' ? -balanceInHomeCurrency : balanceInHomeCurrency);
    }, 0);
  }, [accounts]);

  // Calculate habit-based monthly net flow (Income - Expense)
  const avgMonthlyNetFlow = useMemo(() => {
    if (filteredTransactions.length === 0) return 0;
    // Determine the number of unique months present in the current filter selection
    const months = new Set(filteredTransactions.map(t => t.transaction_date.slice(0, 7)));
    const monthCount = Math.max(1, months.size);
    return (totalIncome - totalSpending) / monthCount;
  }, [filteredTransactions, totalIncome, totalSpending]);

  const handleFinancialConfirm = async (data: any) => {
    if (!financialModal || !user?.id) return;
    let result;
    switch (financialModal.type) {
      case 'OPTIMIZE_BUDGET': // This doesn't add a transaction, so no refreshAllData needed
        result = await upsertBudget(financialModal.contextName!, data.amount, user.id);
        break;
      case 'ADD_GOAL':
        result = await addGoal({ ...data, user_id: user.id });
        if (result?.success) refreshAllData(); // Refresh goals after adding a new one
        break;
      case 'FUND_GOAL':
        // Ensure a valid goal ID is present before attempting to fund
        if (!data.id || typeof data.id !== 'string' || data.id.length === 0) {
          console.error('Dashboard: Attempted to fund a goal with an invalid or missing ID:', data);
          setFinancialModal(null); // Close the modal as we cannot proceed
          return;
        }
        // The trigger tr_sync_goal_debt now handles current_amount update automatically
        result = await addTransaction({
          description: `Contribution to ${financialModal.contextName || 'Savings Goal'}`,
          amount: data.amount,
          type: 'expense',
          category: 'Savings',
          transaction_date: new Date().toISOString().split('T')[0],
          recurring_rule_id: null, // Not from a recurring rule
          account_id: data.account_id,
          goal_id: data.id, // Link the transaction to the goal
          user_id: user.id,
        });
        if (result?.success) refreshAllData();
        break;
      case 'EDIT_GOAL':
        result = await updateGoal(data.id, data);
        break;
      case 'ADD_DEBT':
        result = await addDebt({ ...data, user_id: user.id });
        if (result?.success) refreshAllData(); // Refresh debts after adding a new one
        break;
      case 'PAY_DEBT':
        // The trigger tr_sync_goal_debt now handles remaining_amount update automatically
        result = await addTransaction({
          description: `Debt Payment: ${financialModal.contextName || 'Liability'}`,
          amount: data.amount,
          type: 'expense',
          category: 'Utility',
          recurring_rule_id: null, // Not from a recurring rule
          transaction_date: new Date().toISOString().split('T')[0],
          account_id: data.account_id,
          debt_id: data.id, // Link the transaction to the debt
          user_id: user.id,
        });
        if (result?.success) refreshAllData();
        break;
      case 'EDIT_DEBT':
        result = await updateDebt(data.id, data);
        break;
    }
    if (result?.success) setFinancialModal(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedType('All');
    setSelectedAccountId('All');
    setStartDate('');
    setEndDate('');
    setViewType('custom');
  };

  const handleProcessBills = async () => {
    if (!user?.id) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    // Generate a local YYYY-MM-01 string to avoid UTC shifts
    const currentMonth = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-01`;
    
    const pendingRules = rules.filter(rule => rule.last_processed_month !== currentMonth);

    if (pendingRules.length === 0) {
      alert("All recurring bills for this month have already been processed.");
      return;
    }

    if (window.confirm(`Process ${pendingRules.length} pending recurring transactions for ${now.toLocaleString('default', { month: 'long' })}?`)) {
      let count = 0;
      for (const rule of pendingRules) {
        // Calculate the target day for this month, capping at the last day of the month
        const lastDayInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
        const targetDay = Math.min(rule.day_of_month, lastDayInMonth);
        const formattedTransactionDate = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

        // Check if a transaction matching the rule's core criteria already exists for this month and day
        const transactionAlreadyExists = transactions.some(t => {
          const tDate = t.transaction_date.split('T')[0];
          
          const dateMatches = tDate === formattedTransactionDate; // Exact date match
          const amountMatches = Math.abs(Number(t.amount)).toFixed(2) === Math.abs(Number(rule.amount)).toFixed(2); // Absolute amount match

          // Account matches: If the rule specifies an account, the transaction MUST match that account.
          // If the rule does NOT specify an account (rule.account_id is null),
          // then the trsaction's account_ed for deduplication.
          ount_id === rule.account_id) : true;
// Description matching: Handles both manual entries and system-prefixed "[Recurring]" entries
          const descriptionMatches =
            normalizeDescription(t.description) === normalizeDescription(rule.description) ||
            normalizeDescription(t.description) === normalizeDescription(`[Recurring] ${rule.description}`);

          // Deduplication criteria: Date, Amount, Account (flexible if rule.account_id is null), and Description
          return dateMatches && amountMatches && accountMatches && descriptionMatches;
        });

        if (transactionAlreadyExists) {
          await markAsProcessed(rule.id, currentMonth);
        } else {
          const { success } = await addTransaction({
            description: `[Recurring] ${rule.description}`,
            amount: rule.amount,
            category: rule.category,
            type: rule.type,
            transaction_date: formattedTransactionDate,
            recurring_rule_id: rule.id, // Link the transaction to the recurring rule
            account_id: rule.account_id,
            user_id: user.id
          });
          if (success) {
            await markAsProcessed(rule.id, currentMonth);
            count++;
          }
        }
      }
      alert(`Successfully processed ${count} new transactions.`);
      refreshAllData(); // Reload transaction list and account balances
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    // Flatten splits for a professional export
    const exportData: any[] = [];
    filteredTransactions.forEach(t => {
      const accountName = accounts.find(a => a.id === t.account_id)?.name || 'N/A';
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach((s: any) => {
          exportData.push({
            Date: t.transaction_date.split('T')[0],
            Description: `${t.description} (Split: ${s.notes || 'No Note'})`,
            Category: s.category,
            Account: accountName,
            Amount: s.amount,
            Type: t.type,
          });
        });
        exportData.push({
          Date: t.transaction_date.split('T')[0],
          Description: t.description,
          Category: t.category,
            Account: accountName,
          Amount: t.amount,
          Type: t.type,
        });
      }
    });
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditAccount = (acc: Account) => {
    const accountHasTransactions = transactions.some(t => t.account_id === acc.id || t.to_account_id === acc.id);
    setEditingAccount({ ...acc, hasTransactions: accountHasTransactions });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Generate PDF
            </button>
            <button 
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
            <button 
              onClick={() => setIsRulesModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Rules
            </button>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Categories
            </button>
            <button 
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Manage Recurring
            </button>
            <button 
              onClick={handleProcessBills}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm transition-all relative ${
                rules.length > 0
                  ? 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              Process Bills
              {pendingBillsCount > 0 && (
                <span className="absolute -top-2 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {pendingBillsCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Import CSV
            </button>
            <button 
              onClick={refreshAllData} 
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && !error.toString().toLowerCase().includes('unauthorized') && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 text-red-700 text-sm flex items-center gap-2" role="alert">
            <span>⚠️</span> Error loading transactions: {error}
          </div>
        )}
      
      <AccountSection 
        accounts={accounts}
        rules={rules}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onAddAccount={() => { setIsAddAccountModalOpen(true); setEditingAccount(null); }} // Clear editingAccount when adding new
        onEditAccount={handleEditAccount}
        onDeleteAccount={deleteAccount}
      />

      <ProactiveIntelligence 
        transactions={filteredTransactions}
        budgets={budgets}
        goals={goals}
        debts={debts}
        onAction={(action) => setFinancialModal(action)}
      />

      <WealthProjectionCard 
        currentNetWorth={totalAccountBalance + totalSavings - totalDebt}
        monthlyNetFlow={avgMonthlyNetFlow}
      />

        <div className="bg-white dark:bg-black p-6 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All Time', value: 'all' },
                { label: 'This Month', value: 'thisMonth' },
                { label: 'Last Month', value: 'lastMonth' },
                { label: 'Last 30 Days', value: 'last30' },
                { label: 'YTD', value: 'thisYear' }
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => {
                    if (btn.value === 'thisYear') {
                      setStartDate(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
                      setEndDate(new Date().toISOString().split('T')[0]);
                      setViewType('ytd');
                    } else {
                      handleQuickRange(btn.value as any);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700 transition-all ${
                    (btn.value === 'all' && viewType === 'custom' && !startDate) || 
                    (btn.value === 'thisMonth' && viewType === 'monthly') ||
                    (btn.value === 'lastMonth' && viewType === 'lastMonth') ||
                    (btn.value === 'thisYear' && viewType === 'ytd')
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
              <button 
                onClick={resetFilters}
                className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] md:min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Search</label>
            <input 
              type="text" 
              placeholder="Search descriptions..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Category</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Type</label>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="All">All Types</option>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account</label>
            <select 
              value={selectedAccountId} 
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="All">All Accounts</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors" 
            />
          </div>
          <div className="ml-auto flex gap-6 text-right">
            <div className="transition-colors">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Income</span>
              <div className="text-2xl font-extrabold text-green-600">
                +${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="transition-colors">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spending</span>
              <div className="text-2xl font-extrabold text-red-600">
                ${totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

        <SummaryCards
          transactions={filteredTransactions} 
          comparisonTransactions={comparisonTransactions}
          totalSavings={totalAccountBalance + totalSavings} // Current snapshot
          totalDebt={totalDebt}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SavingsGoals 
            goals={goals}
            onAdd={() => setFinancialModal({ type: 'ADD_GOAL', title: 'Create New Savings Goal' })}
            onFund={(g) => setFinancialModal({ type: 'FUND_GOAL', title: 'Add Funds', contextName: g.name, initialData: { id: g.id } })}
            onEdit={(g) => setFinancialModal({ type: 'EDIT_GOAL', title: 'Edit Goal', initialData: g })}
            onDelete={(id) => {
              const hasTransactions = transactions.some(t => t.goal_id === id);
              if (hasTransactions) {
                alert("This goal has associated funding transactions. Please delete the transaction records first before removing the goal to maintain your account history.");
                return;
              }
              if (window.confirm("Are you sure you want to delete this goal?")) {
                deleteGoal(id);
              }
            }}
          />
          <LiabilitiesAndDebts 
            debts={debts}
            onAdd={() => setFinancialModal({ type: 'ADD_DEBT', title: 'Record New Liability' })}
            onPay={(id) => {
              const d = debts.find(x => x.id === id); // Find the debt to pass its name as context
              setFinancialModal({ type: 'PAY_DEBT', title: 'Make Payment', contextName: d?.name, initialData: { id } });
            }}
            onViewAmortization={(d) => setSelectedAmortization(d)}
            onEdit={(d) => setFinancialModal({ type: 'EDIT_DEBT', title: 'Edit Debt Details', initialData: d })}
            onDelete={(id) => {
              const hasTransactions = transactions.some(t => t.debt_id === id);
              if (hasTransactions) {
                alert("This debt has associated payment transactions. Please delete the payment records first before removing the debt to maintain your account history.");
                return;
              }
              if (window.confirm("Are you sure you want to delete this debt?")) {
                deleteDebt(id);
              }
            }}
          />
        </div>

        <BudgetTracker
          budgets={budgets} 
          transactions={filteredTransactions} 
          categories={categories} 
          onUpsertBudget={(cat, limit) => {
            if (!user?.id) return Promise.resolve({ success: false, error: 'Auth required' });
            return upsertBudget(cat, limit, user.id);
          }} 
        />

        <div className="mb-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 transition-colors">
            <button
              onClick={() => setActiveTab('health')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'health' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Financial Health
            </button>
            <button
              onClick={() => setActiveTab('velocity')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'velocity' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Wealth Velocity
            </button>
            <button
              onClick={() => setActiveTab('networth')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'networth' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Net Worth Progress
            </button>
            <button
              onClick={() => setActiveTab('cumulative')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'cumulative' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
            Spending vs Income
            </button>
            <button
              onClick={() => setActiveTab('merchants')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'merchants' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Merchants
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'trends' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Spending Trends
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 border-transparent ${
                activeTab === 'categories' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Spending by Category
            </button>
          </div>
          
          {activeTab === 'health' && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto">
              {/* Assuming you fetch metrics from /api/analytics/summary */}
              <FinancialHealthRadar metrics={{ 
                savings: 85, // Replace with real data from backend
                burn: 65, 
                debt: 90 
              }} />
            </div>
          )}

          {activeTab === 'velocity' && (
            <div className="animate-in fade-in duration-500">
              <WealthVelocityChart transactions={transactions} />
            </div>
          )}

          {activeTab === 'networth' && (
            <div className="animate-in fade-in duration-500">
              <NetWorthTrendChart transactions={filteredTransactions} currentNetWorth={totalAccountBalance + totalSavings - totalDebt} />
            </div>
          )}

          {activeTab === 'merchants' && (
            <MerchantInsights 
              transactions={filteredTransactions} 
              onMerchantClick={(name) => {
                setSearchTerm(searchTerm === name ? '' : name);
              }}
            />
          )}

          {activeTab === 'trends' && (
            <div className="animate-in fade-in duration-500">
              <SpendingTrendChart transactions={filteredTransactions} />
            </div>
          )}
          
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
              <div className="lg:col-span-8">
                <CategoryBarChart 
                  data={categoryData} 
                  onBarClick={(cat) => setSelectedCategory(selectedCategory === cat ? 'All' : cat)} 
                />
              </div>
              <div className="lg:col-span-4">
                <TagBreakdownChart transactions={filteredTransactions} />
              </div>
            </div>
          )}

          {activeTab === 'cumulative' && (
            <div className="animate-in fade-in duration-500">
              <CumulativeSpendingIncomeChart transactions={filteredTransactions} />
            </div>
          )}
        </div>

        {!editingId ? (
          <TransactionForm
            key="add-new-transaction"
            userId={user?.id} 
            addTransaction={addTransaction}
            existingTransactions={transactions}
            accounts={accounts}
            categories={categories}
            onApplyRules={applyRules}
            onSuccess={refreshAllData} // Pass refreshAllData as onSuccess
          />
        ) : (
          <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 rounded-r-xl animate-in slide-in-from-top-2">
            <TransactionForm
              key={`edit-transaction-${editingId}`}
              userId={user?.id}
              addTransaction={addTransaction}
              existingTransactions={transactions}
              accounts={accounts}
              categories={categories}
              initialData={transactions.find(t => t.id === editingId)}
              onSuccess={refreshAllData} // Pass refreshAllData as onSuccess
              onCancelEdit={() => setEditingId(null)}
              onUpdateTransaction={updateTransaction}
            />
          </div>
        )}

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading transactions...</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <p className="text-gray-500">No transactions match your filters.</p>
          </div>
        ) : (
          <TransactionTable 
            transactions={sortedTransactions}
            accounts={accounts}
            sortConfig={sortConfig}
            categories={categories}
            onSort={requestSort}
            onEdit={startEditing} 
            onDuplicate={handleDuplicateTransaction}
            onDelete={(t) => setDeleteConfirmId({ id: t.id, receipt: t.receipt_url, recurring_rule_id: t.recurring_rule_id })} // Pass full transaction data
            onUpdateStatus={handleUpdateStatus}
            onBulkDelete={handleBulkDelete}
            onBulkStatusUpdate={handleBulkStatusUpdate}
            onViewReceipt={(url) => setActiveReceiptUrl(getPublicUrl(url))}
          />
        )}
      </main>

      <AIAssistant transactions={filteredTransactions} />

      {isImportModalOpen && (
        <CsvImportModal 
          userId={user?.id} 
          accounts={accounts}
          existingTransactions={transactions}
          onApplyRules={applyRules}
          onClose={() => setIsImportModalOpen(false)} 
          onImportSuccess={refreshAllData}
        />
      )}

      {(isAddAccountModalOpen || editingAccount) && (
        <AddAccountModal 
          initialData={editingAccount}
          onClose={() => {
            setIsAddAccountModalOpen(false);
            setEditingAccount(null);
          }} // Clear editingAccount when modal closes
          onAccountAdded={refreshAllData} // Use targeted refresh instead of full page reload
        />
      )}

      {isRecurringModalOpen && (
        <RecurringRulesModal 
          categories={categories}
          accounts={accounts}
          onClose={() => {
            setIsRecurringModalOpen(false);
            refreshAllData(); // Use targeted refresh instead of full page reload
          }}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryManagementModal 
          onClose={() => setIsCategoryModalOpen(false)} 
        />
      )}

      {isRulesModalOpen && (
        <TransactionRulesModal 
          categories={categories}
          transactions={transactions}
          onUpdateTransaction={updateTransaction}
          onClose={() => setIsRulesModalOpen(false)}
        />
      )}

      {activeReceiptUrl && (
        <ReceiptModal 
          url={activeReceiptUrl} 
          onClose={() => setActiveReceiptUrl(null)} 
        />
      )}

      {financialModal && (
        <FinancialActionModal 
          type={financialModal.type}
          title={financialModal.title}
          contextName={financialModal.contextName}
          initialData={financialModal.initialData}
          accounts={accounts} // Pass accounts here
          isLocked={
            financialModal.type === 'EDIT_GOAL' && financialModal.initialData?.id
              ? transactions.some(t => t.goal_id === financialModal.initialData.id)
              : financialModal.type === 'EDIT_DEBT' && financialModal.initialData?.id
                ? transactions.some(t => t.debt_id === financialModal.initialData.id)
                : false
          }
          onClose={() => setFinancialModal(null)}
          onConfirm={handleFinancialConfirm}
        />
      )}

      {selectedAmortization && (
        <AmortizationModal 
          debt={selectedAmortization}
          onClose={() => setSelectedAmortization(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4 dark:bg-opacity-70">
          <div className="bg-white dark:bg-black p-6 rounded-xl shadow-xl max-w-sm w-full border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await handleDeleteTransactionAndUnmarkRule(deleteConfirmId.id, deleteConfirmId.receipt || undefined, deleteConfirmId.recurring_rule_id || undefined);
                  setDeleteConfirmId(null);
                  refreshAllData();
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};