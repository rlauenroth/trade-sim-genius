
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Play } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface ProgressTrackerProps {
  startValue: number | null;
  currentValue: number;
  progressValue: number;
  isSimulationActive: boolean;
}

const ProgressTracker = ({ startValue, currentValue, progressValue, isSimulationActive }: ProgressTrackerProps) => {
  // Don't show progress tracker if no simulation has been started
  if (!startValue) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Simulation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-slate-400 py-4">
            <p className="mb-2">Keine aktive Simulation</p>
            <p className="text-sm">Starten Sie eine Simulation, um den Fortschritt zu verfolgen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const targetValue = startValue * 1.01; // 1% Ziel

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>1% Ziel Fortschritt</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Fortschritt</span>
            <span className="text-white">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-3" />
        </div>
        
        <div className="text-sm">
          <span className="text-slate-400">Ziel: </span>
          <span className="text-white font-medium">
            {formatCurrency(targetValue)}
          </span>
        </div>
        
        <div className="text-xs text-slate-500">
          Status: {isSimulationActive ? 'Aktiv' : 'Pausiert'}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressTracker;
