
import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { ActivityLogEntry } from '@/types/simulation';
import { getTypeIcon, getTypeColor, getIconColor, hasDetails } from './utils';
import LogEntryDetails from './LogEntryDetails';

interface LogEntryProps {
  entry: ActivityLogEntry;
  index: number;
  isExpanded: boolean;
  onToggleExpansion: (index: number) => void;
  onCopyEntry: (entry: ActivityLogEntry) => void;
}

const LogEntry = ({ entry, index, isExpanded, onToggleExpansion, onCopyEntry }: LogEntryProps) => {
  const IconComponent = getTypeIcon(entry.type);
  const typeColor = getTypeColor(entry.type);
  const iconColor = getIconColor(entry.type);

  return (
    <div className="border border-slate-700 rounded p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <IconComponent className={`h-3 w-3 ${iconColor}`} />
            <div className="text-slate-400 font-mono text-xs">
              {new Date(entry.timestamp).toLocaleTimeString('de-DE')}
            </div>
          </div>
          <div className="flex-1">
            <div className={`${typeColor} leading-tight text-sm`}>
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
              onClick={() => onToggleExpansion(index)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
            >
              {isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyEntry(entry)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {hasDetails(entry) && (
        <Collapsible open={isExpanded}>
          <LogEntryDetails entry={entry} isExpanded={isExpanded} />
        </Collapsible>
      )}
    </div>
  );
};

export default LogEntry;
