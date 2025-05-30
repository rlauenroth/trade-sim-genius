
import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PortfolioValueDisplay } from './PortfolioValueDisplay';
import { TradingModeIndicator } from './StatusBadges/TradingModeIndicator';
import { SnapshotAgeBadge } from './StatusBadges/SnapshotAgeBadge';
import { ApiHealthBadge } from './StatusBadges/ApiHealthBadge';
import { AIHealthBadge } from '@/components/AIHealthBadge';
import { AssetAllocationChart } from './AssetAllocationChart';
import { SystemStatusCard } from './SystemStatusCard';
import { AssetDetailCard } from './AssetDetailCard';
import PortfolioOverviewWithStatus from './PortfolioOverviewWithStatus';
import ControlCenter from './ControlCenter';
import ProgressTracker from './ProgressTracker';
import CandidateList from './CandidateList';
import SignalDisplay from './SignalDisplay';
import OpenPositions from './OpenPositions';
import ActivityLog from './ActivityLog';

interface ProfessionalDashboardLayoutProps {
  // Portfolio data
  displayPortfolioValue: number;
  displayStartValue: number | null;
  totalPnL: number;
  totalPnLPercentage: number;
  progressValue: number;
  portfolioHealthStatus: string;
  
  // Simulation state
  simulationState: any;
  isSimulationActive: boolean;
  isPaused?: boolean;
  
  // Actions
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStopSimulation: () => void;
  
  // Signals and trading
  currentSignal: any;
  onAcceptSignal: () => void;
  onIgnoreSignal: () => void;
  candidates: any[];
  openPositions: any[];
  
  // Activity log
  activityLog: any[];
  simulationDataForLog: any;
  
  // Settings
  userSettings: any;
  autoTradeCount?: number;
}

export const ProfessionalDashboardLayout = ({
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
  currentSignal,
  onAcceptSignal,
  onIgnoreSignal,
  candidates,
  openPositions,
  activityLog,
  simulationDataForLog,
  userSettings,
  autoTradeCount
}: ProfessionalDashboardLayoutProps) => {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Mock asset allocation data
  const assetAllocationData = [
    { name: 'BTC', value: 40, color: '#f7931a' },
    { name: 'ETH', value: 30, color: '#627eea' },
    { name: 'USDT', value: 20, color: '#26a17b' },
    { name: 'Others', value: 10, color: '#8b5cf6' },
  ];

  const handleCandidateClick = (candidate: any) => {
    setSelectedAsset({
      symbol: candidate.symbol,
      currentPrice: Math.random() * 100000, // Mock price
      priceData: generateMockPriceData(),
      indicators: {
        rsi: Math.random() * 100,
        macd: (Math.random() - 0.5) * 0.01,
      },
      aiDecisions: [
        { timestamp: Date.now() - 3600000, decision: 'BUY', reason: 'RSI oversold, MACD bullish divergence' },
        { timestamp: Date.now() - 1800000, decision: 'HOLD', reason: 'Consolidation phase, waiting for breakout' },
        { timestamp: Date.now() - 900000, decision: 'SIGNAL', reason: 'Volume spike detected, upward momentum' },
      ]
    });
  };

  const generateMockPriceData = () => {
    const data = [];
    let price = 50000 + Math.random() * 10000;
    
    for (let i = 0; i < 100; i++) {
      const time = new Date(Date.now() - (100 - i) * 15 * 60 * 1000).toISOString().split('T')[0];
      const open = price;
      const change = (Math.random() - 0.5) * 0.02;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({ time, open, high, low, close });
      price = close;
    }
    
    return data;
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">KI-Trading-App v1.0</h1>
          </div>
          
          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <AIHealthBadge />
            <ApiHealthBadge />
            <SnapshotAgeBadge lastUpdate={simulationState?.lastUpdate} />
            <TradingModeIndicator mode={userSettings?.tradingMode || 'simulation'} />
          </div>
          
          {/* Portfolio Value */}
          <PortfolioValueDisplay 
            currentValue={displayPortfolioValue}
            startValue={displayStartValue}
          />
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <ResizablePanelGroup direction="vertical" className="h-full">
        {/* Top Section - 3 Column Layout */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <div className="h-full p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Left Column - Portfolio & Controls (25-30%) */}
              <div className="space-y-4">
                <PortfolioOverviewWithStatus
                  currentValue={displayPortfolioValue}
                  startValue={displayStartValue}
                  totalPnL={totalPnL}
                  totalPnLPercentage={totalPnLPercentage}
                />
                
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Asset-Allokation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AssetAllocationChart data={assetAllocationData} />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {assetAllocationData.map((asset, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: asset.color }}
                          />
                          <span className="text-xs text-slate-300">
                            {asset.name}: {asset.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <ControlCenter
                  isSimulationActive={isSimulationActive}
                  isPaused={isPaused}
                  onStartSimulation={onStartSimulation}
                  onPauseSimulation={onPauseSimulation}
                  onResumeSimulation={onResumeSimulation}
                  onStopSimulation={onStopSimulation}
                  autoTradeCount={autoTradeCount}
                />
                
                <ProgressTracker
                  startValue={displayStartValue}
                  currentValue={displayPortfolioValue}
                  progressValue={progressValue}
                  isSimulationActive={isSimulationActive}
                />
                
                <SystemStatusCard
                  portfolioHealthStatus={portfolioHealthStatus}
                  apiCallsPerMinute={45}
                  apiCallLimit={100}
                  drawdownPercent={totalPnLPercentage}
                  drawdownLimit={5}
                />
              </div>

              {/* Middle Column - Main Content (45-50%) */}
              <div className="space-y-4">
                <SignalDisplay
                  currentSignal={currentSignal}
                  onAcceptSignal={onAcceptSignal}
                  onIgnoreSignal={onIgnoreSignal}
                />
                
                <AssetDetailCard 
                  selectedAsset={selectedAsset}
                  className="h-80"
                />
              </div>

              {/* Right Column - Lists & Details (20-25%) */}
              <div className="space-y-4">
                <CandidateList 
                  candidates={candidates}
                  openPositions={openPositions}
                  onCandidateClick={handleCandidateClick}
                />
                
                <OpenPositions 
                  positions={openPositions}
                  onPositionClick={handleCandidateClick}
                />
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom Section - Resizable Activity Log */}
        <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
          <div className="h-full p-4">
            <ActivityLog
              activityLog={activityLog}
              simulationData={simulationDataForLog}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
