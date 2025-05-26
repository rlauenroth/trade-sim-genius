
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, CheckCircle, AlertTriangle, XCircle, Info, Zap } from 'lucide-react';

interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING';
  message: string;
  source?: string;
}

interface ActivityLogProps {
  activityLog: ActivityLogEntry[];
}

const ActivityLog = ({ activityLog }: ActivityLogProps) => {
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
      default:
        return 'text-slate-300';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Aktivitätsprotokoll</span>
          {activityLog.length > 0 && (
            <span className="text-sm text-slate-400 ml-auto">
              ({activityLog.length} Einträge)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Noch keine Aktivitäten aufgezeichnet
            </div>
          ) : (
            activityLog.slice(-20).reverse().map((entry, index) => (
              <div key={index} className="flex items-start space-x-3 text-sm border-b border-slate-700 pb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  {getTypeIcon(entry.type)}
                  <div className="text-slate-400 font-mono text-xs">
                    {new Date(entry.timestamp).toLocaleTimeString('de-DE')}
                  </div>
                </div>
                <div className="flex-1">
                  <div className={`${getTypeColor(entry.type)} leading-tight`}>
                    {entry.message}
                  </div>
                  {entry.source && (
                    <div className="text-xs text-slate-500 mt-1">
                      {entry.source}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
