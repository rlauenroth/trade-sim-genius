
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { candidateErrorManager } from '@/services/aiErrorHandling/candidateErrorManager';

interface CandidateStatusIconProps {
  symbol: string;
}

export const CandidateStatusIcon: React.FC<CandidateStatusIconProps> = ({ symbol }) => {
  const errorState = candidateErrorManager.getErrorState(symbol);
  const isBlacklisted = candidateErrorManager.isBlacklisted(symbol);
  const canRetry = candidateErrorManager.canRetry(symbol);

  if (isBlacklisted) {
    const timeLeft = errorState?.blacklistedUntil ? 
      Math.max(0, Math.ceil((errorState.blacklistedUntil - Date.now()) / 60000)) : 0;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <XCircle className="h-4 w-4 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium text-red-400">Blacklisted</div>
              <div>Errors: {errorState?.consecutiveErrors || 0}</div>
              <div>Recovery in: {timeLeft}min</div>
              <div className="text-gray-400">Last: {errorState?.lastErrorType}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (errorState && errorState.consecutiveErrors > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium text-yellow-400">Recent Errors</div>
              <div>Count: {errorState.consecutiveErrors}</div>
              <div>Type: {errorState.lastErrorType}</div>
              <div>Can retry: {canRetry ? 'Yes' : 'No'}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!canRetry) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Clock className="h-4 w-4 text-blue-500" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium text-blue-400">Cooldown</div>
              <div>Waiting for retry window</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium text-green-400">Healthy</div>
            <div>Ready for analysis</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
