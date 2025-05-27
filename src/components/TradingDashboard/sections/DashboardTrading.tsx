
import React from 'react';
import SignalDisplay from '../SignalDisplay';
import CandidateList from '../CandidateList';
import OpenPositions from '../OpenPositions';

interface DashboardTradingProps {
  currentSignal: any;
  candidates: any[];
  simulationState: any;
  onAcceptSignal: () => void;
  onIgnoreSignal: () => void;
}

const DashboardTrading = ({
  currentSignal,
  candidates,
  simulationState,
  onAcceptSignal,
  onIgnoreSignal
}: DashboardTradingProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <SignalDisplay 
          currentSignal={currentSignal}
          onAcceptSignal={onAcceptSignal}
          onIgnoreSignal={onIgnoreSignal}
        />
        
        <CandidateList candidates={candidates} maxCandidates={5} />
      </div>
      
      <div>
        <OpenPositions 
          positions={simulationState?.openPositions || []}
        />
      </div>
    </div>
  );
};

export default DashboardTrading;
