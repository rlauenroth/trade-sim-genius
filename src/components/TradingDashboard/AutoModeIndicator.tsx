
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, AlertTriangle } from 'lucide-react';

interface AutoModeIndicatorProps {
  isSimulationActive: boolean;
  hasError?: boolean;
  errorMessage?: string;
  autoTradeCount?: number;
}

const AutoModeIndicator = ({ 
  isSimulationActive, 
  hasError, 
  errorMessage,
  autoTradeCount = 0 
}: AutoModeIndicatorProps) => {
  if (!isSimulationActive) {
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
      return `Automatischer Modus pausiert: ${errorMessage}`;
    }
    return `Automatisch ausgeführt • ${autoTradeCount} Auto-Trades`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()} 
            className="flex items-center space-x-1 text-xs bg-green-600"
          >
            {getIcon()}
            <span>Automatisch ausgeführt</span>
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
