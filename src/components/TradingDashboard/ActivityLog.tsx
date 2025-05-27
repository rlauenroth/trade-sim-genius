
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, CheckCircle, AlertTriangle, XCircle, Info, Zap, Copy, Filter, ChevronDown, ChevronRight, Download, FileJson } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateMarkdownReport, copyToClipboard } from '@/utils/markdownExport';
import { loggingService } from '@/services/loggingService';

interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING' | 'PORTFOLIO_UPDATE' | 'MARKET_DATA' | 'SYSTEM' | 'PERFORMANCE' | 'API' | 'SIM';
  message: string;
  source?: string;
  details?: {
    signalData?: any;
    tradeData?: any;
    portfolioData?: any;
    performanceData?: any;
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

  // Combine activity log with central logs
  const combinedLogs = [
    ...activityLog.map(entry => ({ ...entry, source: entry.source || 'Legacy' })),
    ...centralLogs.map(entry => ({
      ...entry,
      source: 'Central Logging',
      details: entry.meta ? { meta: entry.meta } : undefined
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const getTypeIcon = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'ERROR':
        return <XCircle className="h-3 w-3 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
      case 'AI':
        return <Zap className="h-3 w-3 text-blue-400" />;
      case 'TRADE':
        return <Activity className="h-3 w-3 text-purple-400" />;
      case 'API':
        return <Activity className="h-3 w-3 text-orange-400" />;
      case 'SIM':
        return <Activity className="h-3 w-3 text-cyan-400" />;
      case 'PORTFOLIO_UPDATE':
        return <Activity className="h-3 w-3 text-cyan-400" />;
      case 'MARKET_DATA':
        return <Activity className="h-3 w-3 text-orange-400" />;
      case 'SYSTEM':
        return <Activity className="h-3 w-3 text-gray-400" />;
      case 'PERFORMANCE':
        return <Activity className="h-3 w-3 text-emerald-400" />;
      default:
        return <Info className="h-3 w-3 text-slate-400" />;
    }
  };

  const getTypeColor = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'ERROR':
        return 'text-red-400';
      case 'SUCCESS':
        return 'text-green-400';
      case 'WARNING':
        return 'text-yellow-400';
      case 'AI':
        return 'text-blue-400';
      case 'TRADE':
        return 'text-purple-400';
      case 'API':
        return 'text-orange-400';
      case 'SIM':
        return 'text-cyan-400';
      case 'PORTFOLIO_UPDATE':
        return 'text-cyan-400';
      case 'MARKET_DATA':
        return 'text-orange-400';
      case 'SYSTEM':
        return 'text-gray-400';
      case 'PERFORMANCE':
        return 'text-emerald-400';
      default:
        return 'text-slate-300';
    }
  };

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

  const hasDetails = (entry: ActivityLogEntry) => {
    return (entry.details && Object.keys(entry.details).length > 0) || 
           (entry.meta && Object.keys(entry.meta).length > 0);
  };

  const stats = loggingService.getStats();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Comprehensive Logging</span>
            {filteredLog.length > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({filteredLog.length} Einträge, {stats.total} total)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="SUCCESS">Erfolg</SelectItem>
                <SelectItem value="TRADE">Trades</SelectItem>
                <SelectItem value="AI">KI</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="SIM">Simulation</SelectItem>
                <SelectItem value="ERROR">Fehler</SelectItem>
                <SelectItem value="WARNING">Warnungen</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <FileJson className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <Download className="h-3 w-3 mr-1" />
              MD
            </Button>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="text-xs text-slate-400 space-x-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span key={type}>{type}: {count}</span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLog.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              {filterType === 'all' ? 'Noch keine Aktivitäten aufgezeichnet' : `Keine ${filterType}-Ereignisse gefunden`}
            </div>
          ) : (
            filteredLog.slice(-50).reverse().map((entry, index) => (
              <div key={index} className="border border-slate-700 rounded p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(entry.type)}
                      <div className="text-slate-400 font-mono text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString('de-DE')}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className={`${getTypeColor(entry.type)} leading-tight text-sm`}>
                        {entry.message}
                      </div>
                      {entry.source && (
                        <div className="text-xs text-slate-500 mt-1">
                          {entry.source}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {hasDetails(entry) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEntryExpansion(index)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                      >
                        {expandedEntries.has(index) ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyEntry(entry)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {hasDetails(entry) && expandedEntries.has(index) && (
                  <Collapsible open={expandedEntries.has(index)}>
                    <CollapsibleContent>
                      <div className="mt-2 pl-6 border-l-2 border-slate-600">
                        <div className="text-xs text-slate-400 space-y-1">
                          {entry.meta && (
                            <div>
                              <div className="font-medium text-slate-300">Meta Data:</div>
                              <pre className="text-xs bg-slate-900 p-2 rounded overflow-x-auto">
                                {JSON.stringify(entry.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.details?.signalData && (
                            <div>
                              <div className="font-medium text-slate-300">Signal Details:</div>
                              <div>Typ: {entry.details.signalData.signalType}</div>
                              <div>Asset: {entry.details.signalData.assetPair}</div>
                              {entry.details.signalData.confidenceScore && (
                                <div>Konfidenz: {Math.round(entry.details.signalData.confidenceScore * 100)}%</div>
                              )}
                            </div>
                          )}
                          {entry.details?.tradeData && (
                            <div>
                              <div className="font-medium text-slate-300">Trade Details:</div>
                              <div>Menge: {entry.details.tradeData.quantity?.toFixed(6)}</div>
                              <div>Preis: ${entry.details.tradeData.price?.toFixed(2)}</div>
                              <div>Gebühr: ${entry.details.tradeData.fee?.toFixed(2)}</div>
                            </div>
                          )}
                          {entry.details?.portfolioData && (
                            <div>
                              <div className="font-medium text-slate-300">Portfolio Change:</div>
                              <div>Vorher: ${entry.details.portfolioData.valueBefore?.toFixed(2)}</div>
                              <div>Nachher: ${entry.details.portfolioData.valueAfter?.toFixed(2)}</div>
                              <div>Änderung: {entry.details.portfolioData.changePercent >= 0 ? '+' : ''}{entry.details.portfolioData.changePercent?.toFixed(2)}%</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
