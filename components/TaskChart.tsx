import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartType, Task1Data } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface TaskChartProps {
  data: Task1Data;
}

const TaskChart: React.FC<TaskChartProps> = ({ data }) => {
  // Memoize chart to prevent unnecessary re-renders
  const chartContent = useMemo(() => {
    if (data.type === ChartType.TABLE) {
      const keys = [data.xAxisKey, ...data.dataKeys];
      return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {keys.map(k => (
                            <th key={k} className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{k}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.data.map((row, i) => (
                        <tr key={i}>
                             {keys.map(k => (
                                <td key={k} className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{row[k]}</td>
                             ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300} key={`chart-${data.type}`}>
        {data.type === ChartType.BAR ? (
          <BarChart data={data.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.dataKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]}>
                <LabelList dataKey={key} position="top" style={{ fill: '#666', fontSize: '12px' }} />
              </Bar>
            ))}
          </BarChart>
        ) : data.type === ChartType.LINE ? (
          <LineChart data={data.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.dataKeys.map((key, index) => (
              <Line type="monotone" key={key} dataKey={key} stroke={COLORS[index % COLORS.length]}>
                 <LabelList dataKey={key} position="top" style={{ fill: COLORS[index % COLORS.length], fontSize: '12px' }} />
              </Line>
            ))}
          </LineChart>
        ) : (
          <PieChart>
             <Pie
              data={data.data}
              dataKey={data.dataKeys[0]} // Pie usually takes 1 value key
              nameKey={data.xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
                 // Custom label to show Name: Value
                 return `${data.data[index][data.xAxisKey]}: ${value}`;
              }}
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    );
  }, [data]);

  return chartContent;
};

export default TaskChart;