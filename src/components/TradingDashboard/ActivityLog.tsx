
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateMarkdownReport, copyToClipboard } from '@/utils/markdownExport';
import { loggingService } from '@/services/loggingService';
import LogEntry from './ActivityLog/LogEntry';
import LogStats from './ActivityLog/LogStats';
import LogControls from './ActivityLog/LogControls';

interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING' | 'PORTFOLIO_UPDATE' | 'MARKET_DATA' | 'SYSTEM' | 'PERFORMANCE' | 'API' | 'SIM' | 'EXIT_SCREENING' | 'AUTO_TRADE' | 'SIMULATION' | 'RISK';
  message: string;
  source?: string;
  details?: {
    signalData?: any;
    tradeData?: any;
    portfolioData?: any;
    performanceData?: any;
    apiCall?: {
      method: string;
      endpoint: string;
      duration?: number;
      status?: number;
      response?: any;
    };
  };
  relatedTradeId?: string;
  simulationCycleId?: string;
  meta?: Record<string, any>;
}

interface ActivityLogProps {
  activityLog: ActivityLogEntry[];
  simulationData?: {
    startTime: number;
    endTime?: number;
    startValue: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    totalTrades: number;
  };
}

const ActivityLog = ({ activityLog, simulationData }: ActivityLogProps) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [centralLogs, setCentralLogs] = useState<any[]>([]);

  // Subscribe to central logging service
  useEffect(() => {
    const unsubscribe = loggingService.subscribe((logs) => {
      setCentralLogs(logs);
    });

    return unsubscribe;
  }, []);

  // Enhanced log processing for API calls
  const enhanceLogEntry = (entry: any) => {
    let enhancedMessage = entry.message;
    
    // Add API call details to message if available
    if (entry.meta?.endpoint) {
      const method = entry.meta.method || 'GET';
      const endpoint = entry.meta.endpoint;
      
      if (endpoint.includes('/candles')) {
        enhancedMessage = `CALL ${method} ${endpoint} → OHLCV-Daten für Indikatoren`;
      } else if (endpoint.includes('/orderbook/level1')) {
        enhancedMessage = `CALL ${method} ${endpoint} → Aktueller Preis`;
      } else if (endpoint.includes('/allTickers')) {
        enhancedMessage = `CALL ${method} ${endpoint} → Bulk-Market-Screening`;
      } else if (endpoint.includes('/accounts')) {
        enhancedMessage = `CALL ${method} ${endpoint} → Portfolio-Snapshot`;
      } else if (endpoint.includes('/timestamp')) {
        enhancedMessage = `CALL ${method} ${endpoint} → Health Check`;
      } else {
        enhancedMessage = `CALL ${method} ${endpoint}`;
      }
      
      // Add response time if available
      if (entry.meta.duration) {
        enhancedMessage += ` (${entry.meta.duration}ms)`;
      }
    }

    // Add OpenRouter call details
    if (entry.meta?.openRouterCall) {
      const callType = entry.meta.callType || 'analysis';
      if (callType === 'screening') {
        enhancedMessage = `OpenRouter Bulk-Screening → Top-N Kandidaten`;
      } else if (callType === 'detail') {
        enhancedMessage = `OpenRouter Detail-Analyse → Signal generiert`;
      } else if (callType === 'exit') {
        enhancedMessage = `OpenRouter Exit-Screening → Position-Bewertung`;
      } else {
        enhancedMessage = `OpenRouter ${callType} call`;
      }
    }

    return {
      ...entry,
      message: enhancedMessage
    };
  };

  // Combine activity log with central logs
  const combinedLogs = [
    ...activityLog.map(entry => ({ ...entry, source: entry.source || 'Legacy' })),
    ...centralLogs.map(entry => ({
      ...entry,
      source: 'Central Logging',
      details: entry.meta ? { meta: entry.meta } : undefined
    }))
  ]
    .map(enhanceLogEntry)
    .sort((a, b) => a.timestamp - b.timestamp);

  const filteredLog = filterType === 'all' 
    ? combinedLogs 
    : combinedLogs.filter(entry => entry.type === filterType);

  const handleCopyEntry = async (entry: ActivityLogEntry) => {
    let metaInfo = '';
    if (entry.meta) {
      metaInfo = `\n**Meta:** ${JSON.stringify(entry.meta, null, 2)}`;
    }
    if (entry.details) {
      metaInfo += `\n**Details:** ${JSON.stringify(entry.details, null, 2)}`;
    }

    const markdown = `### ${new Date(entry.timestamp).toLocaleString('de-DE')} - ${entry.type}
**${entry.message}**
${entry.source ? `*Quelle: ${entry.source}*` : ''}${metaInfo}`;

    const success = await copyToClipboard(markdown);
    if (success) {
      toast({
        title: "Kopiert",
        description: "Eintrag als Markdown kopiert",
      });
    } else {
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen",
        variant: "destructive"
      });
    }
  };

  const handleExportReport = async () => {
    const markdown = generateMarkdownReport(combinedLogs, simulationData);
    const success = await copyToClipboard(markdown);
    
    if (success) {
      toast({
        title: "Bericht exportiert",
        description: "Vollständiger Markdown-Bericht in die Zwischenablage kopiert",
      });
    } else {
      toast({
        title: "Export fehlgeschlagen",
        description: "Bericht konnte nicht kopiert werden",
        variant: "destructive"
      });
    }
  };

  const handleExportJSON = async () => {
    const jsonData = loggingService.exportLogs();
    const success = await copyToClipboard(jsonData);
    
    if (success) {
      toast({
        title: "JSON Export",
        description: "Alle Log-Daten als JSON in die Zwischenablage kopiert",
      });
    } else {
      toast({
        title: "Export fehlgeschlagen",
        description: "JSON-Export konnte nicht kopiert werden",
        variant: "destructive"
      });
    }
  };

  const toggleEntryExpansion = (index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  const stats = loggingService.getStats();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>KI Trading Assistant - Aktivitätsbericht</span>
            {filteredLog.length > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({filteredLog.length} Einträge, {stats.total} total)
              </span>
            )}
          </CardTitle>
          <LogControls
            filterType={filterType}
            onFilterChange={setFilterType}
            onExportMarkdown={handleExportReport}
            onExportJSON={handleExportJSON}
          />
        </div>
        <LogStats stats={stats} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLog.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              {filterType === 'all' ? 'Noch keine Aktivitäten aufgezeichnet' : `Keine ${filterType}-Ereignisse gefunden`}
            </div>
          ) : (
            filteredLog.slice(-50).reverse().map((entry, index) => (
              <LogEntry
                key={index}
                entry={entry}
                index={index}
                isExpanded={expandedEntries.has(index)}
                onToggleExpansion={toggleEntryExpansion}
                onCopyEntry={handleCopyEntry}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
