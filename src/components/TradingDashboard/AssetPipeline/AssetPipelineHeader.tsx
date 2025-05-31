
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';

interface AssetPipelineHeaderProps {
  itemCount: number;
  isSimulationActive: boolean;
}

const AssetPipelineHeader = ({ itemCount, isSimulationActive }: AssetPipelineHeaderProps) => {
  return (
    <div className="text-white flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Bot className="h-5 w-5 text-blue-400" />
        <span>Asset Analyse & Handels-Pipeline</span>
        <Badge variant="outline" className="text-slate-300 border-slate-600">
          {itemCount} Assets
        </Badge>
      </div>
      {isSimulationActive && (
        <Badge className="bg-green-600 text-white">
          Auto-Ausführung aktiv
        </Badge>
      )}
    </div>
  );
};

export default AssetPipelineHeader;
