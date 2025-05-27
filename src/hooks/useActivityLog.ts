
import { useState, useCallback } from 'react';
import { ActivityLogEntry, Signal } from '@/types/simulation';

export const useActivityLog = () => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [currentSimulationCycleId, setCurrentSimulationCycleId] = useState<string | null>(null);

  const loadActivityLog = useCallback(() => {
    try {
      const saved = localStorage.getItem('kiTradingApp_activityLog');
      if (saved) {
        const log = JSON.parse(saved);
        setActivityLog(log);
      }
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  }, []);

  const addLogEntry = useCallback((
    type: ActivityLogEntry['type'], 
    message: string, 
    source?: string,
    details?: ActivityLogEntry['details'],
    relatedTradeId?: string
  ) => {
    const entry: ActivityLogEntry = {
      timestamp: Date.now(),
      type,
      message,
      source,
      details,
      relatedTradeId,
      simulationCycleId: currentSimulationCycleId || undefined
    };

    setActivityLog(prev => {
      const updated = [...prev, entry].slice(-500); // Keep last 500 entries
      localStorage.setItem('kiTradingApp_activityLog', JSON.stringify(updated));
      return updated;
    });
  }, [currentSimulationCycleId]);

  const addKucoinLogEntry = useCallback((
    type: ActivityLogEntry['type'], 
    message: string
  ) => {
    addLogEntry(type, message, 'KuCoin via PHP-Proxy');
  }, [addLogEntry]);

  const addKucoinSuccessLog = useCallback((endpoint: string, message?: string) => {
    const logMessage = message || `KuCoin API erfolgreich: ${endpoint}`;
    addKucoinLogEntry('SUCCESS', logMessage);
  }, [addKucoinLogEntry]);

  const addKucoinErrorLog = useCallback((endpoint: string, error: Error) => {
    const logMessage = `KuCoin API Fehler ${endpoint}: ${error.message}`;
    addKucoinLogEntry('ERROR', logMessage);
  }, [addKucoinLogEntry]);

  const addOpenRouterLog = useCallback((
    type: ActivityLogEntry['type'], 
    message: string
  ) => {
    addLogEntry(type, message, 'OpenRouter AI');
  }, [addLogEntry]);

  const addProxyStatusLog = useCallback((isConnected: boolean) => {
    const message = isConnected 
      ? 'PHP-Proxy erfolgreich verbunden'
      : 'PHP-Proxy Verbindung fehlgeschlagen';
    const type = isConnected ? 'SUCCESS' : 'ERROR';
    addLogEntry(type, message, 'Proxy-Test');
  }, [addLogEntry]);

  // Enhanced logging methods
  const addSimulationStartLog = useCallback((startValue: number) => {
    const cycleId = `sim_${Date.now()}`;
    setCurrentSimulationCycleId(cycleId);
    addLogEntry('SUCCESS', `Simulation gestartet mit ${startValue.toLocaleString()} USDT`, 'Simulation', {
      portfolioData: {
        valueBefore: 0,
        valueAfter: startValue,
        change: startValue,
        changePercent: 0
      }
    });
  }, [addLogEntry]);

  const addSimulationStopLog = useCallback((finalValue: number, totalPnL: number, totalPnLPercent: number) => {
    addLogEntry('SUCCESS', `Simulation beendet. Endergebnis: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} USDT (${totalPnLPercent.toFixed(2)}%)`, 'Simulation', {
      portfolioData: {
        valueBefore: finalValue - totalPnL,
        valueAfter: finalValue,
        change: totalPnL,
        changePercent: totalPnLPercent
      }
    });
    setCurrentSimulationCycleId(null);
  }, [addLogEntry]);

  const addTradeLog = useCallback((
    tradeData: {
      id: string;
      assetPair: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      fee: number;
      totalValue: number;
    }
  ) => {
    addLogEntry('TRADE', `${tradeData.type} ${tradeData.quantity.toFixed(6)} ${tradeData.assetPair} @ ${tradeData.price.toFixed(2)} USDT`, 'Trade Execution', {
      tradeData
    }, tradeData.id);
  }, [addLogEntry]);

  const addSignalLog = useCallback((signal: Signal, action: 'generated' | 'accepted' | 'ignored') => {
    const actionText = action === 'generated' ? 'generiert' : action === 'accepted' ? 'angenommen' : 'ignoriert';
    addLogEntry('AI', `Signal ${actionText}: ${signal.signalType} ${signal.assetPair}`, 'KI-Analyse', {
      signalData: signal
    });
  }, [addLogEntry]);

  const addPortfolioUpdateLog = useCallback((valueBefore: number, valueAfter: number, reason: string) => {
    const change = valueAfter - valueBefore;
    const changePercent = valueBefore > 0 ? (change / valueBefore) * 100 : 0;
    
    addLogEntry('PORTFOLIO_UPDATE', `Portfolio aktualisiert: ${change >= 0 ? '+' : ''}${change.toFixed(2)} USDT (${reason})`, 'Portfolio Manager', {
      portfolioData: {
        valueBefore,
        valueAfter,
        change,
        changePercent
      }
    });
  }, [addLogEntry]);

  const clearActivityLog = useCallback(() => {
    setActivityLog([]);
    localStorage.removeItem('kiTradingApp_activityLog');
  }, []);

  return {
    activityLog,
    loadActivityLog,
    addLogEntry,
    addKucoinLogEntry,
    addKucoinSuccessLog,
    addKucoinErrorLog,
    addOpenRouterLog,
    addProxyStatusLog,
    addSimulationStartLog,
    addSimulationStopLog,
    addTradeLog,
    addSignalLog,
    addPortfolioUpdateLog,
    clearActivityLog,
    currentSimulationCycleId
  };
};
