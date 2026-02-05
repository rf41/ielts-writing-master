import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartType, Task1Data } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Format number with thousand separator
const formatNumber = (value: any) => {
  if (typeof value === 'number') {
    return value.toLocaleString('en-US');
  }
  // Try to parse string as number
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num.toLocaleString('en-US');
  }
  return value;
};

interface TaskChartProps {
  data: Task1Data;
  zoomLevel?: number;
}

// Custom tick component for word wrapping
const CustomTick = ({ x, y, payload }: any) => {
  // Convert to string and handle non-string values
  const value = String(payload.value || '');
  const words = value.split(' ');
  const maxCharsPerLine = 12;
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word: string) => {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={0}
          dy={index * 12 + 8}
          textAnchor="middle"
          fill="#666"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

const TaskChart: React.FC<TaskChartProps> = ({ data, zoomLevel = 100 }) => {
  // Normalize data for Pie Chart if needed
  const normalizedData = useMemo(() => {
    if (data.type === ChartType.PIE) {
      // Check if data structure is correct for pie chart
      // Pie chart needs: xAxisKey (category name), dataKeys (value key), data (array of {category, value})
      const hasValidStructure = 
        data.xAxisKey && 
        data.dataKeys.length > 0 && 
        data.data.length > 0 &&
        data.data[0][data.xAxisKey] !== undefined &&
        data.data[0][data.dataKeys[0]] !== undefined;

      if (!hasValidStructure) {
        // Try to auto-fix: if xAxisKey or dataKeys are missing/wrong
        const firstItem = data.data[0] || {};
        const keys = Object.keys(firstItem);
        
        // Assume first key is category, second is value
        const categoryKey = data.xAxisKey || keys[0] || 'category';
        const valueKey = data.dataKeys[0] || keys[1] || 'value';
        
        return {
          ...data,
          xAxisKey: categoryKey,
          dataKeys: [valueKey],
          data: data.data.map(item => {
            // Ensure each item has the correct keys
            const category = item[categoryKey] || Object.values(item)[0];
            const value = item[valueKey] || Object.values(item)[1] || 0;
            return {
              [categoryKey]: category,
              [valueKey]: typeof value === 'number' ? value : parseFloat(String(value)) || 0
            };
          })
        };
      }
    }
    return data;
  }, [data]);

  // Memoize chart to prevent unnecessary re-renders
  const chartContent = useMemo(() => {
    const chartHeight = 300 * (zoomLevel / 100);
    const pieRadius = 80 * (zoomLevel / 100);

    if (normalizedData.type === ChartType.TABLE) {
      const keys = [normalizedData.xAxisKey, ...normalizedData.dataKeys];
      return (
        <div className="overflow-x-auto" style={{ fontSize: `${zoomLevel}%` }}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {keys.map(k => (
                            <th key={k} className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{k}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {normalizedData.data.map((row, i) => (
                        <tr key={i}>
                             {keys.map(k => (
                                <td key={k} className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatNumber(row[k])}</td>
                             ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={chartHeight} key={`chart-${normalizedData.type}`}>
        {normalizedData.type === ChartType.BAR ? (
          <BarChart data={normalizedData.data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
            <XAxis 
              dataKey={normalizedData.xAxisKey} 
              stroke="#666" 
              className="dark:stroke-gray-300" 
              tick={<CustomTick />}
              height={50}
              interval={0}
            />
            <YAxis stroke="#666" className="dark:stroke-gray-300" tick={{ fill: '#666' }} tickFormatter={formatNumber} />
            <Tooltip formatter={formatNumber} />
            <Legend />
            {normalizedData.dataKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]}>
                <LabelList dataKey={key} position="top" content={(props: any) => {
                  const { x, y, value } = props;
                  return (
                    <text x={x} y={y} dy={-10} fill="#666" fontSize={12} textAnchor="middle">
                      {formatNumber(value)}
                    </text>
                  );
                }} />
              </Bar>
            ))}
          </BarChart>
        ) : normalizedData.type === ChartType.LINE ? (
          <LineChart data={normalizedData.data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
            <XAxis 
              dataKey={normalizedData.xAxisKey} 
              stroke="#666" 
              className="dark:stroke-gray-300" 
              tick={<CustomTick />}
              height={50}
              interval={0}
            />
            <YAxis stroke="#666" className="dark:stroke-gray-300" tick={{ fill: '#666' }} tickFormatter={formatNumber} />
            <Tooltip formatter={formatNumber} />
            <Legend />
            {normalizedData.dataKeys.map((key, index) => (
              <Line type="monotone" key={key} dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2}>
                 <LabelList dataKey={key} position="top" content={(props: any) => {
                  const { x, y, value } = props;
                  if (value === undefined || value === null) return null;
                  return (
                    <text x={x} y={y} dy={-10} fill={COLORS[index % COLORS.length]} fontSize={11} textAnchor="middle" fontWeight="bold">
                      {formatNumber(value)}
                    </text>
                  );
                }} />
              </Line>
            ))}
          </LineChart>
        ) : (
          <PieChart>
             <Pie
              data={normalizedData.data}
              dataKey={normalizedData.dataKeys[0]} // Pie usually takes 1 value key
              nameKey={normalizedData.xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={pieRadius}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
                 // Custom label to show Name: Value
                 return `${normalizedData.data[index][normalizedData.xAxisKey]}: ${formatNumber(value)}`;
              }}
            >
              {normalizedData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatNumber} />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    );
  }, [normalizedData, zoomLevel]);

  return chartContent;
};

export default TaskChart;