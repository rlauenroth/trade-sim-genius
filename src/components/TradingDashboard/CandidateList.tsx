
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown, Minus, Search, Eye } from 'lucide-react';
import { Candidate } from '@/types/candidate';

interface CandidateListProps {
  candidates: Candidate[];
  maxCandidates?: number;
  openPositions?: any[];
}

const CandidateList: React.FC<CandidateListProps> = ({ 
  candidates, 
  maxCandidates = 5,
  openPositions = []
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = (candidate: Candidate) => {
    switch (candidate.status) {
      case 'screening':
        return 'bg-yellow-400';
      case 'analyzed':
        return 'bg-blue-400';
      case 'signal':
        if (candidate.signalType === 'BUY') return 'bg-green-400';
        if (candidate.signalType === 'SELL') return 'bg-red-400';
        if (candidate.signalType === 'HOLD') return 'bg-gray-400';
        return 'bg-blue-400';
      case 'exit-screening':
        return 'bg-orange-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (candidate: Candidate) => {
    if (candidate.status === 'screening') {
      return <Search className="h-3 w-3 text-yellow-600" />;
    }
    if (candidate.status === 'exit-screening') {
      return <Eye className="h-3 w-3 text-orange-600" />;
    }
    if (candidate.status === 'signal') {
      if (candidate.signalType === 'BUY') return <TrendingUp className="h-3 w-3 text-green-600" />;
      if (candidate.signalType === 'SELL') return <TrendingDown className="h-3 w-3 text-red-600" />;
      if (candidate.signalType === 'HOLD') return <Minus className="h-3 w-3 text-gray-600" />;
    }
    return null;
  };

  const getStatusText = (candidate: Candidate) => {
    switch (candidate.status) {
      case 'screening':
        return 'Screening läuft...';
      case 'analyzed':
        return 'Analyse abgeschlossen';
      case 'signal':
        return `Signal: ${candidate.signalType}`;
      case 'exit-screening':
        return 'Exit-Screening aktiv';
      default:
        return 'Unbekannt';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Check if candidate has open position
  const hasOpenPosition = (symbol: string) => {
    return openPositions.some(pos => 
      pos.assetPair?.includes(symbol) || pos.assetPair?.startsWith(symbol)
    );
  };

  // Enhance candidates with exit-screening status for open positions
  const enhancedCandidates = candidates.map(candidate => {
    if (hasOpenPosition(candidate.symbol) && candidate.status === 'signal') {
      return { ...candidate, status: 'exit-screening' as const };
    }
    return candidate;
  });

  const displayedCandidates = enhancedCandidates.slice(0, maxCandidates);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg text-white">Candidate Assets</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-400 hover:text-slate-300" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-700 border-slate-600">
                    <p className="text-sm text-white">
                      Zeigt alle Assets im AI-Screening-Prozess und Exit-Überwachung
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {enhancedCandidates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">Keine Kandidaten verfügbar</p>
                <p className="text-slate-500 text-xs mt-1">
                  Starten Sie eine Simulation, um Asset-Analyse zu beginnen
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {displayedCandidates.map((candidate, index) => (
                  <TooltipProvider key={`${candidate.symbol}-${index}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-default">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(candidate)}`} />
                              {getStatusIcon(candidate) && (
                                <div className="absolute -top-1 -right-1">
                                  {getStatusIcon(candidate)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">
                                {candidate.symbol}
                                {hasOpenPosition(candidate.symbol) && (
                                  <span className="ml-2 text-xs text-orange-400">(Position offen)</span>
                                )}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {getStatusText(candidate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {candidate.confidence && (
                              <p className="text-slate-300 text-sm font-medium">
                                {Math.round(candidate.confidence * 100)}%
                              </p>
                            )}
                            <p className="text-slate-500 text-xs">
                              {formatTimestamp(candidate.timestamp)}
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-700 border-slate-600">
                        <div className="text-sm text-white space-y-1">
                          <p><strong>Asset:</strong> {candidate.symbol}</p>
                          <p><strong>Status:</strong> {getStatusText(candidate)}</p>
                          {candidate.confidence && (
                            <p><strong>Confidence:</strong> {Math.round(candidate.confidence * 100)}%</p>
                          )}
                          <p><strong>Zeit:</strong> {formatTimestamp(candidate.timestamp)}</p>
                          {hasOpenPosition(candidate.symbol) && (
                            <p className="text-orange-400"><strong>Exit-Screening aktiv</strong></p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                
                {enhancedCandidates.length > maxCandidates && (
                  <div className="text-center pt-2">
                    <p className="text-slate-500 text-xs">
                      +{enhancedCandidates.length - maxCandidates} weitere Kandidaten
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CandidateList;
