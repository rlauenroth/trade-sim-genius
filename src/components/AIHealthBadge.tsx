
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAIHealthStatus } from '@/hooks/useAIHealthStatus';

export const AIHealthBadge: React.FC = () => {
  const { healthStatus } = useAIHealthStatus();

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3" />;
      case 'degraded':
        return <AlertTriangle className="h-3 w-3" />;
      case 'critical':
        return <XCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    const rate = (healthStatus.successRate * 100).toFixed(1);
    return `AI: ${rate}%`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${getStatusColor()} text-white hover:opacity-80 transition-opacity flex items-center gap-1`}
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-medium">AI System Health</div>
            <div>Success Rate: {(healthStatus.successRate * 100).toFixed(1)}%</div>
            <div>Status: {healthStatus.status.toUpperCase()}</div>
            {healthStatus.activeBlacklists > 0 && (
              <div className="text-yellow-300">
                Blacklisted: {healthStatus.activeBlacklists} symbols
              </div>
            )}
            {healthStatus.fallbacksUsed > 0 && (
              <div className="text-blue-300">
                Fallbacks used: {healthStatus.fallbacksUsed}
              </div>
            )}
            <div className="text-gray-400 text-xs mt-1">
              Last updated: {new Date(healthStatus.lastUpdate).toLocaleTimeString()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
