
import { useState, useCallback, useRef } from 'react';
import { Signal } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

export type SignalState = 'IDLE' | 'GENERATED' | 'PROCESSING' | 'EXECUTED' | 'FAILED' | 'CLEARED';

interface SignalStateMachine {
  currentSignal: Signal | null;
  signalState: SignalState;
  processingLock: boolean;
  lastStateChange: number;
}

export const useSignalStateMachine = () => {
  const [state, setState] = useState<SignalStateMachine>({
    currentSignal: null,
    signalState: 'IDLE',
    processingLock: false,
    lastStateChange: Date.now()
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timeout
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Set timeout for state transitions
  const setStateTimeout = useCallback((newState: SignalState, timeoutMs: number = 30000) => {
    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      console.log(`⚠️ Signal state timeout reached: ${state.signalState} -> FAILED`);
      loggingService.logError('Signal state machine timeout', {
        currentState: state.signalState,
        targetState: newState,
        timeoutMs
      });
      
      setState(prev => ({
        ...prev,
        signalState: 'FAILED',
        processingLock: false,
        lastStateChange: Date.now()
      }));
    }, timeoutMs);
  }, [state.signalState, clearTimeoutRef]);

  // Transition to new state with validation
  const transitionTo = useCallback((newState: SignalState, signal?: Signal | null) => {
    const now = Date.now();
    
    console.log(`🔄 Signal state transition: ${state.signalState} -> ${newState}`);
    
    loggingService.logEvent('SYSTEM', `Signal state transition: ${state.signalState} -> ${newState}`, {
      signal: signal?.assetPair,
      signalType: signal?.signalType,
      previousState: state.signalState,
      newState,
      timestamp: now
    });

    setState(prev => ({
      currentSignal: signal !== undefined ? signal : prev.currentSignal,
      signalState: newState,
      processingLock: newState === 'PROCESSING',
      lastStateChange: now
    }));

    // Set appropriate timeouts for each state
    switch (newState) {
      case 'PROCESSING':
        setStateTimeout('FAILED', 30000); // 30s timeout for processing
        break;
      case 'GENERATED':
        setStateTimeout('FAILED', 60000); // 60s timeout for signal to be picked up
        break;
      default:
        clearTimeoutRef();
        break;
    }
  }, [state.signalState, setStateTimeout, clearTimeoutRef]);

  // Generate new signal (from AI)
  const generateSignal = useCallback((signal: Signal) => {
    if (state.processingLock) {
      console.log('🔒 Signal generation blocked - processing lock active');
      return false;
    }

    if (state.signalState !== 'IDLE' && state.signalState !== 'CLEARED') {
      console.log(`🔒 Signal generation blocked - current state: ${state.signalState}`);
      return false;
    }

    transitionTo('GENERATED', signal);
    return true;
  }, [state.processingLock, state.signalState, transitionTo]);

  // Start processing signal
  const startProcessing = useCallback(() => {
    if (state.signalState !== 'GENERATED') {
      console.log(`❌ Cannot start processing from state: ${state.signalState}`);
      return false;
    }

    transitionTo('PROCESSING');
    return true;
  }, [state.signalState, transitionTo]);

  // Mark signal as executed
  const markExecuted = useCallback(() => {
    if (state.signalState !== 'PROCESSING') {
      console.log(`❌ Cannot mark executed from state: ${state.signalState}`);
      return false;
    }

    transitionTo('EXECUTED');
    
    // Auto-clear after successful execution
    setTimeout(() => {
      transitionTo('CLEARED', null);
      setTimeout(() => transitionTo('IDLE', null), 1000);
    }, 2000);
    
    return true;
  }, [state.signalState, transitionTo]);

  // Mark signal as failed
  const markFailed = useCallback((reason?: string) => {
    loggingService.logError('Signal processing failed', {
      signal: state.currentSignal?.assetPair,
      reason,
      currentState: state.signalState
    });

    transitionTo('FAILED');
    
    // Auto-clear after failure
    setTimeout(() => {
      transitionTo('CLEARED', null);
      setTimeout(() => transitionTo('IDLE', null), 3000);
    }, 5000);
    
    return true;
  }, [state.currentSignal, state.signalState, transitionTo]);

  // Force clear (emergency reset)
  const forceClear = useCallback(() => {
    console.log('🔧 Force clearing signal state machine');
    clearTimeoutRef();
    transitionTo('IDLE', null);
  }, [clearTimeoutRef, transitionTo]);

  // Check if new signal generation is allowed
  const canGenerateNewSignal = useCallback(() => {
    return !state.processingLock && 
           (state.signalState === 'IDLE' || state.signalState === 'CLEARED');
  }, [state.processingLock, state.signalState]);

  // Get current signal if it's actionable
  const getActionableSignal = useCallback(() => {
    return (state.signalState === 'GENERATED' || state.signalState === 'PROCESSING') 
      ? state.currentSignal 
      : null;
  }, [state.signalState, state.currentSignal]);

  return {
    // State
    currentSignal: state.currentSignal,
    signalState: state.signalState,
    processingLock: state.processingLock,
    lastStateChange: state.lastStateChange,
    
    // Actions
    generateSignal,
    startProcessing,
    markExecuted,
    markFailed,
    forceClear,
    
    // Queries
    canGenerateNewSignal,
    getActionableSignal
  };
};
