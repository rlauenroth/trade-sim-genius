
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { useSimGuard } from '@/hooks/useSimGuard';

interface ControlCenterProps {
  isSimulationActive: boolean;
  isPaused?: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
}

const ControlCenter = ({
  isSimulationActive,
  isPaused,
  onStartSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStopSimulation
}: ControlCenterProps) => {
  const { canStart, reason, state } = useSimGuard();

  const handleStartSimulation = () => {
    if (canStart) {
      onStartSimulation();
    }
  };

  const handleResumeSimulation = () => {
    if (canStart) {
      onResumeSimulation();
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Kontrolle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isSimulationActive ? (
          <div>
            <Button 
              onClick={handleStartSimulation}
              disabled={!canStart}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              title={!canStart ? reason : undefined}
            >
              <Play className="mr-2 h-4 w-4" />
              Simulation starten
            </Button>
            {!canStart && (
              <div className="mt-2 text-xs text-red-400 text-center">
                {reason}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!isPaused ? (
              <Button 
                onClick={onPauseSimulation} 
                variant="outline" 
                className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pausieren
              </Button>
            ) : (
              <div>
                <Button 
                  onClick={handleResumeSimulation}
                  disabled={!canStart}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  title={!canStart ? reason : undefined}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Fortsetzen
                </Button>
                {!canStart && (
                  <div className="mt-2 text-xs text-red-400 text-center">
                    {reason}
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={onStopSimulation} 
              variant="destructive" 
              className="w-full"
            >
              <Square className="mr-2 h-4 w-4" />
              Simulation stoppen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ControlCenter;
