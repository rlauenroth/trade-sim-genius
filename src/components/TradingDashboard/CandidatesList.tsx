
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Candidate } from '@/types/candidate';
import { CandidateStatusIcon } from '@/components/CandidateStatusIcon';

interface CandidatesListProps {
  candidates: Candidate[];
}

export const CandidatesList: React.FC<CandidatesListProps> = ({ candidates }) => {
  if (candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analyse-Kandidaten</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Keine Kandidaten verfügbar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Analyse-Kandidaten ({candidates.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {candidates.map(candidate => (
            <div key={candidate.symbol} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <CandidateStatusIcon symbol={candidate.symbol} />
                <span className="text-sm font-medium">{candidate.symbol}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    candidate.status === 'signal' ? 'default' :
                    candidate.status === 'analyzed' ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {candidate.status === 'screening' && 'Screening'}
                  {candidate.status === 'analyzed' && 'Analysiert'}
                  {candidate.status === 'signal' && candidate.signalType}
                </Badge>
                
                {candidate.confidence && (
                  <span className="text-xs text-gray-500">
                    {(candidate.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
