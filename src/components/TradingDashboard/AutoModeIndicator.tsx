
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, AlertTriangle, CheckCircle } from 'lucide-react';

interface AutoModeIndicatorProps {
  isAutoMode: boolean;
  isSimulationActive: boolean;
  hasError?: boolean;
  errorMessage?: string;
  autoTradeCount?: number;
}

const AutoModeIndicator = ({ 
  isAutoMode, 
  isSimulationActive, 
  hasError, 
  errorMessage,
  autoTradeCount = 0 
}: AutoModeIndicatorProps) => {
  if (!isAutoMode || !isSimulationActive) {
    return null;
  }

  const getIcon = () => {
    if (hasError) return <AlertTriangle className="h-3 w-3" />;
    return <Settings className="h-3 w-3 animate-spin" />;
  };

  const getVariant = () => {
    if (hasError) return "destructive" as const;
    return "default" as const;
  };

  const getTooltipContent = () => {
    if (hasError) {
      return `Automatischer Modus gestoppt: ${errorMessage}`;
    }
    return `Automatischer Modus aktiv • ${autoTradeCount} Auto-Trades ausgeführt`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()} 
            className="flex items-center space-x-1 text-xs"
          >
            {getIcon()}
            <span>Automatisch</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AutoModeIndicator;
