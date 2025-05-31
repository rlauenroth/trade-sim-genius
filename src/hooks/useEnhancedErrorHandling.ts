
import { useCallback, useState } from 'react';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';

interface ErrorContext {
  component: string;
  action: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

interface ErrorState {
  hasError: boolean;
  errorCount: number;
  lastError: Error | null;
  recoveryAttempts: number;
}

export const useEnhancedErrorHandling = (context: ErrorContext) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorCount: 0,
    lastError: null,
    recoveryAttempts: 0
  });

  const handleError = useCallback((
    error: Error,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    userAction?: string
  ) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      severity,
      context,
      userAction,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log error
    loggingService.logError(`${context.component}: ${context.action} failed`, errorDetails);

    // Update error state
    setErrorState(prev => ({
      hasError: true,
      errorCount: prev.errorCount + 1,
      lastError: error,
      recoveryAttempts: prev.recoveryAttempts
    }));

    // Show user notification based on severity
    if (severity === 'high' || severity === 'critical') {
      toast({
        title: "Fehler aufgetreten",
        description: `${context.action} fehlgeschlagen: ${error.message}`,
        variant: "destructive"
      });
    }

    // Auto-recovery for low severity errors
    if (severity === 'low' && errorState.recoveryAttempts < 3) {
      setTimeout(() => {
        setErrorState(prev => ({
          ...prev,
          hasError: false,
          recoveryAttempts: prev.recoveryAttempts + 1
        }));
      }, 2000);
    }

    return errorDetails;
  }, [context, errorState.recoveryAttempts]);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      errorCount: 0,
      lastError: null,
      recoveryAttempts: 0
    });
  }, []);

  const withErrorHandling = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    operationName: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<T | null> => {
    try {
      const result = await asyncOperation();
      
      // Clear error on success
      if (errorState.hasError) {
        clearError();
      }
      
      return result;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), severity, operationName);
      return null;
    }
  }, [handleError, clearError, errorState.hasError]);

  return {
    errorState,
    handleError,
    clearError,
    withErrorHandling
  };
};
