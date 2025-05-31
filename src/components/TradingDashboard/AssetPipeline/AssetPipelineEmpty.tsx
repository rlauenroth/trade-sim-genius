
import React from 'react';
import { Activity } from 'lucide-react';

const AssetPipelineEmpty = () => {
  return (
    <div className="text-center py-8">
      <Activity className="h-12 w-12 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-400">Keine Assets in der Analyse-Pipeline</p>
      <p className="text-sm text-slate-500 mt-1">
        Die KI wird automatisch mit der Marktanalyse beginnen, sobald die Simulation gestartet wird.
      </p>
    </div>
  );
};

export default AssetPipelineEmpty;
