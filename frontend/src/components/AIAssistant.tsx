import React, { useState, useRef, useEffect } from 'react';
import { Transaction } from '../hooks/useTransactions';

interface AIAssistantProps {
  transactions: Transaction[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hi! I'm your FinanceTracker assistant. I can help you understand your spending or guide you through the app. What's on your mind?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input;
    if (!messageToSend.trim()) return;
    
    const userMessage = messageToSend.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsSubmitting(true);

    // Simple Logic / FAQ Brain
    setTimeout(() => {
      const lower = userMessage.toLowerCase();
      let response = "I'm not sure about that. Try asking about 'spending', 'income', 'top category', or app features like 'recurring bills' and 'CSV imports'.";
      
      if (lower.includes('spending') || lower.includes('expense')) {
        const total = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        response = `Based on your current filters, your total spending is $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} across ${transactions.filter(t => t.type === 'expense').length} transactions.`;
      } 
      else if (lower.includes('income')) {
        const total = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        response = `Your total income for the current selection is $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
      } 
      else if (lower.includes('category') || lower.includes('top')) {
        const expenses = transactions.filter(t => t.type === 'expense');
        if (expenses.length > 0) {
          const cats: Record<string, number> = {};
          expenses.forEach(t => cats[t.category] = (cats[t.category] || 0) + Number(t.amount));
          const [topCat, topAmount] = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
          response = `Your top spending category is "${topCat}" with $${topAmount.toLocaleString()}. You can manage or add new categories using the 'Categories' button.`;
        } else {
          response = "I don't see any expenses in the current view to analyze categories.";
        }
      } 
      else if (lower.includes('recurring') || lower.includes('bill')) {
        response = "You can set up monthly bills in 'Manage Recurring'. Once set, use the 'Process Bills' button at the top to automatically generate this month's transactions.";
      } 
      else if (lower.includes('import') || lower.includes('csv') || (lower.includes('add') && lower.includes('transaction'))) {
        response = `You have two ways to get your data into the system:

• The Manual Way: Use the Add New Transaction form. If you are logging a receipt with multiple items, don't forget to use the "+ Split Category" button.

• The Pro Way (CSV Import): Click Import CSV.
1. Select the account the file belongs to (Destination Account).
2. Map your bank's columns to our fields.
3. Review & De-duplicate: Our engine will automatically flag transactions you've already imported so you never double-count your spending.

For the "Import CSV" feature in your Finance Tracker, there are five required fields that must be mapped from your CSV file to the application during the import process.

Based on the mapping logic defined in the CsvMapDataStep component, these fields are:

1. Transaction Date: The date the transaction occurred. The system is designed to intelligently parse most standard date formats.
2. Amount: The numerical value of the transaction. The import engine automatically handles currency symbols and different negative notations (like parentheses).
3. Description: The text describing the transaction (e.g., the merchant name).
4. Category: The classification for the transaction. If a value is missing or doesn't match your custom categories, the system fallbacks to "General" but still requires the column to be mapped.
5. Type: This defines whether the transaction is an income, expense, or transfer.

6. Linked Account (Optional): If your CSV contains transactions for multiple banks, map this to automatically route them to the correct account (e.g., "PK-Checking").

Optional fields:
Notes and Tags allow you to add extra context and metadata to your transactions for better organization and granular tracking.`;
      } 
      else if (lower.includes('rule') || lower.includes('automate')) {
        response = `Automation rules allow you to set up conditions that automatically process your transactions as they are added or imported.

1. Clean Messy Descriptions (Sub-string matching):
If your bank shows something like "SQ *STREAMELEMENTS CH 888-555-0000", you can create a rule:
• Keyword: "STREAMELEMENTS"
• Alias: "StreamElements"
The system looks for that specific word (no wildcards like * needed).

2. Assign Categories:
Define "Rules" to assign categories based on merchant keywords:
• Keyword: "Starbucks" -> Category: "Dining & Drinks"
• Keyword: "Amazon" -> Category: "Shopping"

To manage these, click the 'Rules' button in the header. Rules work for both manual entry and CSV imports.`;
      }
      else if (lower.includes('hi') || lower.includes('hello') || lower.includes('help')) {
        response = "Hello! I can help you analyze your current data or explain how to use FinanceTracker features. Try asking 'What is my top category?'";
      }
      else if (lower.includes('how') && lower.includes('net worth') && lower.includes('calculate')) {
        response = `Your **Current Net Worth** is a snapshot of your total wealth. It is calculated using the following formula:

• **(+) Sum of all Account Balances** (Checking, Savings, Investments, etc.)
• **(+) Total Current Savings** (Money already allocated to your Savings Goals)
• **(-) Total Outstanding Debts** (Remaining balances on Loans, Credit Cards, etc.)

**Example Calculation:**
1. **Assets**: $3,420 (Checking) + $5,884 (Savings) + $500 (Funded Goal) = **$9,804**
2. **Liabilities**: $7,609 (Credit Card) + $25,000 (Loan) = **$32,609**
3. **Net Worth**: $9,804 - $32,609 = **-$22,805**

If we look at your math: $5,883.71 + $3,420.83 + $7,608.96 + $500.00 - $25,000.00 = -$7,586.50.
You treated the $7,608.96 from your credit card as "Cash in the bank" (an asset). Because that is money you owe to the bank, it must be subtracted.

As you pay down your credit card and contribute to goals, this number will increase!

Note: The "Net Change" shown in other cards only reflects the profit/loss of the specific dates you are currently filtering.`;
      }
      else if (lower.includes('wealth projection') || lower.includes('trajectory')) {
        response = `**Wealth Projection** is an AI-driven estimate of your future financial standing. 

It takes your **Current Net Worth** and adds your **Average Monthly Net Flow** (Total Income - Total Expenses) projected over 12 months and 60 months. It assumes your current spending and earning habits remain consistent.`;
      }
      else if (lower.includes('net worth') || lower.includes('wealth')) {
        const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        response = `In this current filtered view, your net flow (Income - Expenses) is $${(inc - exp).toLocaleString()}. For your total global standing, look at the 'Current Net Worth' card or ask me 'How is net worth calculated?'`;
      }
      else if (lower.includes('manage') && lower.includes('transaction')) {
        response = "In the 'Transaction Records' section, hover over any row to see actions like 'Edit', 'Delete', 'Clone', and 'Clear'. You can also use the checkboxes on the left to select multiple transactions for bulk actions like 'Delete Selected' or 'Mark Cleared'.";
      }
      else if (lower.includes('saving') || lower.includes('goal')) {
        response = `You can create new objectives in the 'Savings Goals' section by clicking '+ Add Goal'. 

Example: Setting up an 'Emergency Fund'
1. Click **+ Add Goal**.
2. **Name**: Emergency Fund.
3. **Target Amount**: 10000.
4. **Deadline**: Select a future date (e.g., 2025-12-31).

Once set, the system calculates your **Monthly Required** savings target. Use the 'Fund' button to record contributions toward your goal directly from your balance.`;
      }
      else if (lower.includes('liability') || lower.includes('debt')) {
        response = `To track what you owe, go to the 'Liabilities & Debts' section and click '+ Add Debt'. 

Example: Setting up a 'Car Loan'
1. Click **+ Add Debt**.
2. **Name**: Car Loan.
3. **Total Balance**: 25000.
4. **Interest Rate**: 4.5 (APR %).
5. **Min Payment**: 450.

The system will generate a **Payoff Schedule** (click the 'Chart' icon) to show how long it takes to be debt-free. If your payment is too low to cover monthly interest, I will alert you with a critical warning!`;
      }
      else if (lower.includes('add') && lower.includes('account')) {
        response = "To track a new bank account, credit card, or investment portfolio, click the '+ Add Account' dashed box in the accounts section at the top of the dashboard. You can specify the institution name, currency, and starting balance.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsSubmitting(false);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[2000] print:hidden">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
          title="Ask Assistant"
        >
          <span className="text-2xl group-hover:animate-bounce">✨</span>
        </button>
      ) : (
        <div className="bg-white dark:bg-neutral-900 w-80 md:w-[440px] h-[800px] max-h-[90vh] rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <span className={`text-xl ${isTyping ? 'animate-pulse' : ''}`}>✨</span>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">AI Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors p-1">✕</button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4 space-y-4 bg-gray-50 dark:bg-black/20 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20 shadow-lg' 
                    : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          <div className="pt-3 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-gray-800">
            <p className="px-4 text-[10px] text-gray-400 font-bold uppercase mb-2">Try Asking:</p>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pl-4 pr-2 pb-3 custom-scrollbar">
              {[
                "How do I import transaction CSV or Add a Transaction record?",
                "How do I manage Transaction records?",
                "How do I add Account?",
                "How do I manage recurring bills?",
                "What are automation rules?",
                "How do I setup Saving Goals?",
                "How do I setup Liabilities & Debts?",
                "How is Current Net Worth calculated?",
                "What is Wealth Projection?",
                "What is my net worth?",
                "What is my top category?",
                "What is my total spending?"
              ].map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSend(question)}
                  className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          {/* Input area */}
          <div className="p-4 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-gray-800">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input 
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                <span className="block transform rotate-[-45deg] mb-0.5 ml-0.5">➤</span>
              </button>
            </form>
            <p className="text-[9px] text-gray-400 mt-3 text-center uppercase tracking-tighter">Powered by FinanceTracker Intelligence</p>
          </div>
        </div>
      )}
    </div>
  );
};