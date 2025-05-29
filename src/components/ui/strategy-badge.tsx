
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Zap } from 'lucide-react';

interface StrategyBadgeProps {
  strategy: 'conservative' | 'balanced' | 'aggressive';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StrategyBadge = ({ strategy, size = 'md', showIcon = true }: StrategyBadgeProps) => {
  const getStrategyDisplayName = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'Konservativ';
      case 'balanced':
        return 'Ausgewogen';
      case 'aggressive':
        return 'Aggressiv';
      default:
        return strategy;
    }
  };

  const getStrategyIcon = (strategy: string) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    switch (strategy) {
      case 'conservative':
        return <Shield className={iconSize} />;
      case 'balanced':
        return <TrendingUp className={iconSize} />;
      case 'aggressive':
        return <Zap className={iconSize} />;
      default:
        return <TrendingUp className={iconSize} />;
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'conservative':
        return 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20';
      case 'balanced':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
      case 'aggressive':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getStrategyColor(strategy)} ${sizeClasses[size]} flex items-center gap-1.5 transition-colors`}
    >
      {showIcon && getStrategyIcon(strategy)}
      {getStrategyDisplayName(strategy)}
    </Badge>
  );
};
