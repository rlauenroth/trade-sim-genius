
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { CandidateStatusIcon } from '@/components/CandidateStatusIcon';
import { Candidate } from '@/types/candidate';

interface CandidateListProps {
  candidates: Candidate[];
  openPositions?: any[];
  maxCandidates?: number;
  onCandidateClick?: (candidate: Candidate) => void;
}

const CandidateList = ({ 
  candidates = [], 
  openPositions = [], 
  maxCandidates = 10,
  onCandidateClick 
}: CandidateListProps) => {
  const displayCandidates = candidates.slice(0, maxCandidates);

  const getSignalBadge = (candidate: Candidate) => {
    if (candidate.signalType === 'BUY') {
      return <Badge variant="default" className="bg-green-600 text-xs">BUY</Badge>;
    } else if (candidate.signalType === 'SELL') {
      return <Badge variant="destructive" className="text-xs">SELL</Badge>;
    }
    return null;
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Jetzt';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'screening': return 'Screening';
      case 'analyzed': return 'Analysiert';
      case 'signal': return 'Signal generiert';
      case 'exit-screening': return 'Exit-Screening';
      default: return 'Unbekannt';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <span>Analyse-Pipeline</span>
          <Badge variant="secondary" className="text-xs">
            {candidates.length} Kandidaten
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayCandidates.length === 0 ? (
          <div className="text-center text-slate-400 py-4 text-sm">
            Keine Kandidaten in der Pipeline
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {displayCandidates.map((candidate, index) => (
              <div
                key={index}
                className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => onCandidateClick?.(candidate)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CandidateStatusIcon symbol={candidate.symbol} />
                    <span className="text-white text-sm font-medium">
                      {candidate.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getSignalBadge(candidate)}
                    {onCandidateClick && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-300 text-xs">
                    Status: {getStatusText(candidate.status)}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(candidate.timestamp)}
                  </div>
                </div>
                
                {candidate.confidence && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-400 text-xs">Konfidenz:</span>
                    <span className="text-white text-xs">{candidate.confidence}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateList;
