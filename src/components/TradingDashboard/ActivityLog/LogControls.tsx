
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Download, FileJson } from 'lucide-react';

interface LogControlsProps {
  filterType: string;
  onFilterChange: (value: string) => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
}

const LogControls = ({ filterType, onFilterChange, onExportMarkdown, onExportJSON }: LogControlsProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Select value={filterType} onValueChange={onFilterChange}>
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
        onClick={onExportJSON}
        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
      >
        <FileJson className="h-3 w-3 mr-1" />
        JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportMarkdown}
        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
      >
        <Download className="h-3 w-3 mr-1" />
        MD
      </Button>
    </div>
  );
};

export default LogControls;
