
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  Pause, 
  Settings, 
  Lock,
  Activity,
  Target,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { useSimulation } from '@/hooks/useSimulation';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

const TradingDashboard = () => {
  const { userSettings, lockApp } = useAppState();
  const { 
    simulationState, 
    isSimulationActive, 
    startSimulation, 
    stopSimulation, 
    pauseSimulation,
    resumeSimulation,
    acceptSignal,
    ignoreSignal,
    currentSignal,
    activityLog
  } = useSimulation();

  const [timeElapsed, setTimeElapsed] = useState('00:00:00');

  useEffect(() => {
    if (isSimulationActive && simulationState?.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - simulationState.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setTimeElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isSimulationActive, simulationState?.startTime]);

  const getStatusBadge = () => {
    if (!isSimulationActive) {
      return <Badge variant="secondary" className="bg-slate-600">Bereit</Badge>;
    }
    
    if (simulationState?.isPaused) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-400">Pausiert</Badge>;
    }
    
    return <Badge className="bg-green-600">Simulation aktiv</Badge>;
  };

  const getProgressValue = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    
    const targetValue = simulationState.startPortfolioValue * 1.01; // 1% Ziel
    const currentProgress = simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
    const targetProgress = targetValue - simulationState.startPortfolioValue;
    
    return Math.min(100, Math.max(0, (currentProgress / targetProgress) * 100));
  };

  const getTotalPnL = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    return simulationState.currentPortfolioValue - simulationState.startPortfolioValue;
  };

  const getTotalPnLPercentage = () => {
    if (!simulationState?.startPortfolioValue || !simulationState?.currentPortfolioValue) return 0;
    return ((simulationState.currentPortfolioValue - simulationState.startPortfolioValue) / simulationState.startPortfolioValue) * 100;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">KI Trading Assistant</h1>
              <p className="text-slate-400">Paper-Trading Dashboard</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-slate-400">
            <Settings className="h-4 w-4 mr-2" />
            Einstellungen
          </Button>
          <Button variant="ghost" size="sm" onClick={lockApp} className="text-slate-400">
            <Lock className="h-4 w-4 mr-2" />
            Sperren
          </Button>
        </div>
      </div>

      {/* Strategy Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-slate-400">Strategie: </span>
                <span className="text-white font-medium">
                  {userSettings.tradingStrategy === 'conservative' ? 'Konservativ' : 
                   userSettings.tradingStrategy === 'balanced' ? 'Ausgewogen' : 'Aggressiv'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-400">KI-Modell: </span>
                <span className="text-white font-medium">
                  {userSettings.selectedAiModelId.split('/')[1] || userSettings.selectedAiModelId}
                </span>
              </div>
            </div>
            {isSimulationActive && (
              <div className="text-sm text-slate-400">
                Laufzeit: <span className="text-white font-mono">{timeElapsed}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Portfolio Overview */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>Simuliertes Portfolio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(simulationState?.currentPortfolioValue || 0)}
              </div>
              <div className="text-sm text-slate-400">
                Start: {formatCurrency(simulationState?.startPortfolioValue || 0)}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getTotalPnL() >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className={`font-medium ${getTotalPnL() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(getTotalPnL())} ({formatPercentage(getTotalPnLPercentage())})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Progress to 1% Goal */}
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
                <span className="text-white">{Math.round(getProgressValue())}%</span>
              </div>
              <Progress value={getProgressValue()} className="h-3" />
            </div>
            
            <div className="text-sm">
              <span className="text-slate-400">Ziel: </span>
              <span className="text-white font-medium">
                {formatCurrency((simulationState?.startPortfolioValue || 0) * 1.01)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Control Center */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Kontrolle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isSimulationActive ? (
              <Button 
                onClick={startSimulation} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Simulation starten
              </Button>
            ) : (
              <div className="space-y-2">
                {!simulationState?.isPaused ? (
                  <Button 
                    onClick={pauseSimulation} 
                    variant="outline" 
                    className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pausieren
                  </Button>
                ) : (
                  <Button 
                    onClick={resumeSimulation} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Fortsetzen
                  </Button>
                )}
                
                <Button 
                  onClick={stopSimulation} 
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
      </div>

      {/* Signal Display */}
      {currentSignal && (
        <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <span>Neues KI-Signal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-400">Asset</div>
                <div className="font-bold text-white">{currentSignal.assetPair}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Aktion</div>
                <Badge className={currentSignal.signalType === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
                  {currentSignal.signalType === 'BUY' ? 'KAUFEN' : 'VERKAUFEN'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-slate-400">Ziel</div>
                <div className="text-white">{formatCurrency(currentSignal.takeProfitPrice)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Stop-Loss</div>
                <div className="text-white">{formatCurrency(currentSignal.stopLossPrice)}</div>
              </div>
            </div>
            
            {currentSignal.reasoning && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-slate-400 mb-1">KI-Begründung:</div>
                <div className="text-sm text-slate-200">{currentSignal.reasoning}</div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => acceptSignal(currentSignal)} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Signal für Simulation annehmen
              </Button>
              <Button 
                onClick={() => ignoreSignal(currentSignal)} 
                variant="outline" 
                className="flex-1 border-slate-600 text-slate-300"
              >
                Signal ignorieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Positions */}
      {simulationState?.openPositions && simulationState.openPositions.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Offene simulierte Positionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {simulationState.openPositions.map((position) => (
                <div key={position.id} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium text-white">{position.assetPair}</div>
                        <div className="text-sm text-slate-400">
                          {position.quantity} @ {formatCurrency(position.entryPrice)}
                        </div>
                      </div>
                      <Badge className={position.type === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
                        {position.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </div>
                      <div className="text-sm text-slate-400">
                        TP: {formatCurrency(position.takeProfit)} | SL: {formatCurrency(position.stopLoss)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
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
    </div>
  );
};

export default TradingDashboard;
