
import { useState, useCallback } from 'react';
import { ActivityLogEntry } from '@/types/simulation';

export const useActivityLog = () => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

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
    source?: string
  ) => {
    const entry: ActivityLogEntry = {
      timestamp: Date.now(),
      type,
      message,
      source
    };

    setActivityLog(prev => {
      const updated = [...prev, entry].slice(-200); // Keep last 200 entries
      localStorage.setItem('kiTradingApp_activityLog', JSON.stringify(updated));
      return updated;
    });
  }, []);

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

  return {
    activityLog,
    loadActivityLog,
    addLogEntry,
    addKucoinLogEntry,
    addKucoinSuccessLog,
    addKucoinErrorLog,
    addOpenRouterLog,
    addProxyStatusLog
  };
};
