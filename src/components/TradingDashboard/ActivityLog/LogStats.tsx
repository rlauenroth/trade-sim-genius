
import React from 'react';

interface LogStatsProps {
  stats: {
    total: number;
    byType: Record<string, number>;
  };
}

const LogStats = ({ stats }: LogStatsProps) => {
  if (stats.total === 0) return null;

  return (
    <div className="text-xs text-slate-400 space-x-4">
      {Object.entries(stats.byType).map(([type, count]) => (
        <span key={type}>{type}: {count}</span>
      ))}
    </div>
  );
};

export default LogStats;
