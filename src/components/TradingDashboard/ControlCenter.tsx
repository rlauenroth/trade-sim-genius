
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, AlertCircle, RefreshCw } from 'lucide-react';
import { useSimGuard } from '@/hooks/useSimGuard';
import { simReadinessStore } from '@/stores/simReadiness';
import AutoModeIndicator from './AutoModeIndicator';

interface ControlCenterProps {
  isSimulationActive: boolean;
  isPaused?: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  autoTradeCount?: number;
  autoModeError?: string;
}

const ControlCenter = ({
  isSimulationActive,
  isPaused,
  onStartSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStopSimulation,
  autoTradeCount,
  autoModeError
}: ControlCenterProps) => {
  const { canStart, reason, debug } = useSimGuard();

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

  // Manual state correction function
  const handleForceStateCorrection = () => {
    console.log('🔧 Manual state correction triggered');
    simReadinessStore.forceRefresh();
    
    // Force state to READY if we have portfolio data
    if (debug.centralSnapshot && !debug.centralLoading) {
      console.log('🔧 Forcing state to READY due to valid central data');
      // This will be handled by the auto-correction in useSimGuard
    }
  };

  // Debug function to show detailed status
  const handleShowDebugInfo = () => {
    console.log('🔍 Debug Info:', debug);
    const detailedStatus = simReadinessStore.getDetailedStatus();
    console.log('📊 Detailed SimReadiness Status:', detailedStatus);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Kontrolle</span>
          <AutoModeIndicator 
            isSimulationActive={isSimulationActive}
            hasError={!!autoModeError}
            errorMessage={autoModeError}
            autoTradeCount={autoTradeCount}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simulation Controls */}
        {!isSimulationActive ? (
          <div>
            <Button 
              onClick={handleStartSimulation}
              disabled={!canStart}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              title={!canStart ? reason : undefined}
            >
              <Play className="mr-2 h-4 w-4" />
              Automatische Simulation starten
            </Button>
            {!canStart && (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-red-400 text-center">
                  {reason}
                </div>
                {debug.centralSnapshot && !debug.centralLoading && (
                  <div className="text-xs text-yellow-400 text-center bg-yellow-900/20 border border-yellow-600/30 rounded p-2">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <AlertCircle className="h-3 w-3" />
                      <span>Portfolio-Daten verfügbar - State-Problem erkannt</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        onClick={handleForceStateCorrection}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-yellow-600/50 text-yellow-300 hover:bg-yellow-900/30"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        State korrigieren
                      </Button>
                      <Button
                        onClick={handleShowDebugInfo}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-yellow-400 hover:bg-yellow-900/20"
                      >
                        Debug
                      </Button>
                    </div>
                  </div>
                )}
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

        <div className="text-xs text-slate-400 text-center">
          Alle Signale werden automatisch ausgeführt
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlCenter;
