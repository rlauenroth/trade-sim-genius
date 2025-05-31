import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Clock, TrendingUp, BarChart3, CheckCircle, Play } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useRiskManagement } from '@/hooks/useRiskManagement';
import { useAppState } from '@/hooks/useAppState';
import { getAssetCategory } from '@/config/aiSignalConfig';
import { useEnhancedSimulation } from '@/hooks/useEnhancedSimulation';
import EnhancedSignalDisplay from './EnhancedSignalDisplay';

interface Signal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
}

interface SignalDisplayProps {
  currentSignal: Signal | null;
  availableSignals?: Signal[];
  onAcceptSignal: (signal: Signal) => void;
  onIgnoreSignal: (signal: Signal) => void;
  portfolioValue?: number;
}

const SignalDisplay = ({ 
  currentSignal, 
  availableSignals = [], 
  portfolioValue 
}: SignalDisplayProps) => {
  // Use enhanced simulation for signal state
  const { signalState, forceSignalReset } = useEnhancedSimulation();

  // Use enhanced display component
  return (
    <EnhancedSignalDisplay
      currentSignal={currentSignal}
      signalState={signalState}
      availableSignals={availableSignals}
      portfolioValue={portfolioValue}
      onForceReset={forceSignalReset}
    />
  );
};

export default SignalDisplay;
