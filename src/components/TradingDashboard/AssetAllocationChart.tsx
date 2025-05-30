
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AssetData {
  name: string;
  value: number;
  color: string;
}

interface AssetAllocationChartProps {
  data: AssetData[];
  className?: string;
}

export const AssetAllocationChart = ({ data, className }: AssetAllocationChartProps) => {
  return (
    <div className={`${className} h-24`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={40}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
