
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { PIPELINE_STEP_LABELS } from '@/types/candidate';

interface PipelineProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  isError: boolean;
  isHealthy: boolean;
  statusDescription: string;
}

const PipelineProgressIndicator = ({
  currentStep,
  totalSteps = 7,
  isError,
  isHealthy,
  statusDescription
}: PipelineProgressIndicatorProps) => {
  const getProgressValue = () => {
    if (isError) return 0;
    if (currentStep < 0) return 0;
    return Math.min((currentStep / totalSteps) * 100, 100);
  };

  const getProgressColor = () => {
    if (isError) return 'bg-red-500';
    if (currentStep >= totalSteps) return 'bg-green-500';
    if (currentStep >= 4) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const getStatusIcon = () => {
    if (isError) return <XCircle className="h-4 w-4 text-red-500" />;
    if (!isHealthy) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (currentStep >= totalSteps) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const getCurrentStepLabel = () => {
    if (currentStep < 0) return 'Error';
    return PIPELINE_STEP_LABELS[currentStep] || 'Unknown';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-slate-300">
            {getCurrentStepLabel()}
          </span>
          <Badge 
            variant="outline" 
            className={`text-xs ${isError ? 'border-red-500 text-red-400' : 'border-slate-600 text-slate-400'}`}
          >
            {currentStep >= 0 ? `${currentStep}/${totalSteps}` : 'Error'}
          </Badge>
        </div>
        <span className="text-xs text-slate-500">
          {statusDescription}
        </span>
      </div>
      
      <Progress 
        value={getProgressValue()} 
        className="h-2 bg-slate-700"
      />
    </div>
  );
};

export default PipelineProgressIndicator;
