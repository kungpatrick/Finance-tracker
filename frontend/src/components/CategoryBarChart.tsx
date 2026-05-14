import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface CategoryData {
  name: string;
  spent: number;
  limit: number;
  color?: string;
}

interface CategoryBarChartProps {
  data: CategoryData[];
  onBarClick?: (categoryName: string) => void;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data, onBarClick }) => {
  // Filter out categories with zero amount to avoid cluttering the chart
  const filteredData = data
    .filter(item => item.spent > 0 || item.limit > 0)
    .sort((a, b) => b.spent - a.spent);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Spending by Category</h3>
        <p className="text-center text-gray-500">No spending data to display for categories.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center transition-colors">Spending by Category</h3>
      <div className="h-[450px] w-full"> {/* Maintain consistent height with other charts */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            layout="vertical" // Make it a horizontal bar chart for better category label readability
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400"
              tickFormatter={(val) => `$${val}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:fill-gray-400"
              width={100} // Adjust width to prevent category names from overlapping
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
            />
            <Legend verticalAlign="top" height={36}/>
            <Bar 
              dataKey="spent" 
              name="Actual Spent" 
              radius={[0, 4, 4, 0]}
              onClick={(data) => onBarClick?.(data.name)}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
              ))}
            </Bar>
            <Bar dataKey="limit" fill="#94a3b8" name="Budget Limit" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};