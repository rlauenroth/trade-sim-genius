
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Pause, Square, Info } from 'lucide-react';
import { useSimGuard } from '@/hooks/useSimGuard';
import { useSettingsStore } from '@/stores/settingsStore';
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
  const { canStart, reason, state } = useSimGuard();
  const { userSettings, toggleAutoMode } = useSettingsStore();

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

  const handleAutoModeToggle = async () => {
    await toggleAutoMode();
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Kontrolle</span>
          <AutoModeIndicator 
            isAutoMode={userSettings.autoMode || false}
            isSimulationActive={isSimulationActive}
            hasError={!!autoModeError}
            errorMessage={autoModeError}
            autoTradeCount={autoTradeCount}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AutoMode Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-mode" className="text-sm text-slate-300">
              Automatischer Modus
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>KI-Signale werden automatisch als Trades ausgeführt</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="auto-mode"
            checked={userSettings.autoMode || false}
            onCheckedChange={handleAutoModeToggle}
            disabled={isSimulationActive && !isPaused}
          />
        </div>

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

        {userSettings.autoMode && isSimulationActive && (
          <div className="text-xs text-slate-400 text-center">
            Signale werden automatisch ausgeführt
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ControlCenter;
