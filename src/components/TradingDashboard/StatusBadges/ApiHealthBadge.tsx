
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ApiHealthBadgeProps {
  className?: string;
}

export const ApiHealthBadge = ({ className }: ApiHealthBadgeProps) => {
  const { status, lastSuccess, consecutiveFailures } = useNetworkStatus();
  
  const getStatusConfig = () => {
    if (status === 'connected' && consecutiveFailures === 0) {
      return {
        variant: 'default' as const,
        icon: <Wifi className="h-3 w-3" />,
        text: 'API OK',
        color: 'bg-green-500'
      };
    } else if (status === 'connected' && consecutiveFailures < 3) {
      return {
        variant: 'secondary' as const,
        icon: <AlertTriangle className="h-3 w-3" />,
        text: 'API Warn',
        color: 'bg-yellow-500'
      };
    } else {
      return {
        variant: 'destructive' as const,
        icon: <WifiOff className="h-3 w-3" />,
        text: 'API Error',
        color: 'bg-red-500'
      };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={`${className} flex items-center gap-1`}>
      {config.icon}
      <span className="text-xs">{config.text}</span>
    </Badge>
  );
};
