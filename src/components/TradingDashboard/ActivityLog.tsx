
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING';
  message: string;
}

interface ActivityLogProps {
  activityLog: ActivityLogEntry[];
}

const ActivityLog = ({ activityLog }: ActivityLogProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Aktivitätsprotokoll</span>
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
              <div key={index} className="flex items-start space-x-3 text-sm">
                <div className="text-slate-400 font-mono min-w-0">
                  {new Date(entry.timestamp).toLocaleTimeString('de-DE')}
                </div>
                <div className={`flex-1 ${
                  entry.type === 'ERROR' ? 'text-red-400' : 
                  entry.type === 'SUCCESS' ? 'text-green-400' : 
                  entry.type === 'AI' ? 'text-blue-400' : 'text-slate-300'
                }`}>
                  {entry.message}
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
