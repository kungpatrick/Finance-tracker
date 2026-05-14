import React, { useState } from 'react';
import { useCategories, Category } from '../hooks/useCategories';

interface CategoryManagementModalProps {
  onClose: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({ onClose }) => {
  const { categories, addCategory, deleteCategory, loading } = useCategories();
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState('#6366f1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    const result = await addCategory({
      name: name.trim(),
      type,
      color
    });
    setSubmitting(false);

    if (result.success) {
      setName('');
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1600] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative border border-gray-200 dark:border-gray-700 transition-colors">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
        
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Manage Categories</h3>

        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-black p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-8 space-y-4 transition-colors">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="category-name" className="block text-xs font-bold text-gray-400 uppercase mb-1">Category Name</label>
              <input id="category-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. Subscriptions" />
            </div>
            <div>
              <label htmlFor="category-type" className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Color</label>
              <div className="flex gap-2"> {/* Added aria-label to inputs */}
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 border-none bg-transparent cursor-pointer" aria-label="Category Color Picker" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 px-3 py-1 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white uppercase font-mono" aria-label="Category Color Hex Code" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50">
            {submitting ? 'Adding...' : '+ Add Category'}
          </button>
        </form>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Custom Categories</h4>
          {loading ? (
            <p className="text-center py-4 text-gray-400 italic">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-center py-4 text-gray-400 italic">No custom categories yet.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{cat.name}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{cat.type}</span>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};