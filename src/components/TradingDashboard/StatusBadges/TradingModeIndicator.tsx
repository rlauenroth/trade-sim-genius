
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle } from 'lucide-react';

interface TradingModeIndicatorProps {
  mode: 'simulation' | 'real';
  className?: string;
}

export const TradingModeIndicator = ({ mode, className }: TradingModeIndicatorProps) => {
  if (mode === 'real') {
    return (
      <Badge variant="destructive" className={`${className} flex items-center gap-1 animate-pulse`}>
        <AlertTriangle className="h-3 w-3" />
        <span className="text-xs font-bold">REAL TRADING</span>
      </Badge>
    );
  }

  return (
    <Badge variant="default" className={`${className} flex items-center gap-1 bg-green-600`}>
      <Shield className="h-3 w-3" />
      <span className="text-xs">SIMULATION</span>
    </Badge>
  );
};
