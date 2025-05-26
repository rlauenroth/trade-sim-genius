
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface ProgressTrackerProps {
  startValue: number;
  currentValue: number;
  progressValue: number;
}

const ProgressTracker = ({ startValue, currentValue, progressValue }: ProgressTrackerProps) => {
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
      </CardContent>
    </Card>
  );
};

export default ProgressTracker;
