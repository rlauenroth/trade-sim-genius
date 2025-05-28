
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface TradingModeIndicatorProps {
  mode: 'simulation' | 'real';
  className?: string;
}

const TradingModeIndicator = ({ mode, className = '' }: TradingModeIndicatorProps) => {
  if (mode === 'real') {
    return (
      <Badge 
        className={`bg-red-600 text-white border-red-500 px-3 py-1 ${className}`}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        REAL MODE
      </Badge>
    );
  }

  return (
    <Badge 
      className={`bg-green-600 text-white border-green-500 px-3 py-1 ${className}`}
    >
      <CheckCircle className="h-3 w-3 mr-1" />
      SIMULATION
    </Badge>
  );
};

export default TradingModeIndicator;
