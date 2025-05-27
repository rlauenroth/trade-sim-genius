
import React from 'react';
import { ActivityLogEntry } from '@/types/simulation';
import { CollapsibleContent } from '@/components/ui/collapsible';

interface LogEntryDetailsProps {
  entry: ActivityLogEntry;
  isExpanded: boolean;
}

const LogEntryDetails = ({ entry, isExpanded }: LogEntryDetailsProps) => {
  if (!isExpanded) return null;

  return (
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
  );
};

export default LogEntryDetails;
