import React from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AIHealthBadge } from '@/components/AIHealthBadge';
import PortfolioOverviewWithStatus from '../PortfolioOverviewWithStatus';
import ControlCenter from '../ControlCenter';
import ProgressTracker from '../ProgressTracker';
import CandidateList from '../CandidateList';
import SignalDisplay from '../SignalDisplay';
import OpenPositions from '../OpenPositions';
import ActivityLog from '../ActivityLog';
import { TradingModeIndicator } from '../StatusBadges/TradingModeIndicator';
import { ApiHealthBadge } from '../StatusBadges/ApiHealthBadge';
import { SettingsDialog } from '../SettingsDialog';

interface DashboardGridsProps {
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  portfolioHealthStatus: string;
  simulationState: any;
  isSimulationActive: boolean;
  isPaused?: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  autoTradeCount?: number;
  candidates: any[];
  openPositions: any[];
  currentSignal: any;
  onAcceptSignal: () => void;
  onIgnoreSignal: () => void;
  activityLog: any[];
  simulationDataForLog: any;
  userSettings: any;
  apiKeys: any;
}

const DashboardGrids = ({
  displayPortfolioValue,
  displayStartValue,
  totalPnL,
  totalPnLPercentage,
  progressValue,
  portfolioHealthStatus,
  simulationState,
  isSimulationActive,
  isPaused,
  onStartSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStopSimulation,
  autoTradeCount,
  candidates,
  openPositions,
  currentSignal,
  onAcceptSignal,
  onIgnoreSignal,
  activityLog,
  simulationDataForLog,
  userSettings,
  apiKeys
}: DashboardGridsProps) => {
  
  const handleRefreshClick = () => {
    // Force refresh portfolio data
    window.location.reload();
  };

  const handleLogoutClick = () => {
    // Clear all data and redirect to setup
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
          <AIHealthBadge />
          <ApiHealthBadge />
        </div>
        
        <div className="flex items-center gap-2">
          <TradingModeIndicator mode={userSettings?.tradingMode || 'simulation'} />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            className="flex items-center gap-2 text-white border-slate-600 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <SettingsDialog onRefresh={handleRefreshClick} />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutClick}
            className="flex items-center gap-2 text-white border-slate-600 hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Container className="py-6 space-y-6">
        {/* Top Row - Portfolio Overview and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioOverviewWithStatus
              currentValue={displayPortfolioValue}
              startValue={displayStartValue}
              totalPnL={totalPnL}
              totalPnLPercentage={totalPnLPercentage}
            />
          </div>
          
          <div>
            <ControlCenter
              isSimulationActive={isSimulationActive}
              isPaused={isPaused}
              onStartSimulation={onStartSimulation}
              onPauseSimulation={onPauseSimulation}
              onResumeSimulation={onResumeSimulation}
              onStopSimulation={onStopSimulation}
              autoTradeCount={autoTradeCount}
            />
          </div>
        </div>

        {/* Middle Row - Progress and Signal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProgressTracker
            startValue={displayStartValue}
            currentValue={displayPortfolioValue}
            progressValue={progressValue}
            isSimulationActive={isSimulationActive}
          />
          
          <SignalDisplay
            currentSignal={currentSignal}
            onAcceptSignal={onAcceptSignal}
            onIgnoreSignal={onIgnoreSignal}
          />
        </div>

        {/* Bottom Row - Candidates, Positions, and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CandidateList 
            candidates={candidates}
            openPositions={openPositions}
          />
          
          <OpenPositions 
            positions={openPositions}
          />
          
          <div className="lg:col-span-1">
            <ActivityLog
              activityLog={activityLog}
              simulationData={simulationDataForLog}
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default DashboardGrids;
