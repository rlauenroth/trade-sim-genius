
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, DollarSign } from 'lucide-react';
import VerificationBadge from '../VerificationBadge';
import { VerificationStatus } from '@/types/settingsV2';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';

interface ModelSectionProps {
  formData: {
    modelId: string;
    openRouterKey: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  verificationStatus: VerificationStatus;
  verificationMessage?: string;
}

const ModelSection = ({
  formData,
  onFieldChange,
  onVerify,
  isVerifying,
  verificationStatus,
  verificationMessage
}: ModelSectionProps) => {
  const availableModels = modelProviderService.getAllModels();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>KI-Modell</span>
          </div>
          <VerificationBadge 
            status={verificationStatus} 
            message={verificationMessage}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-300">Modell auswählen</Label>
          <Select
            value={formData.modelId}
            onValueChange={(value) => onFieldChange('modelId', value)}
          >
            <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-1">
              <SelectValue placeholder="Modell auswählen..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {availableModels.map((model) => {
                const provider = modelProviderService.getOptimalProvider(model.id);
                return (
                  <SelectItem key={model.id} value={model.id} className="text-white">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        {model.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Standard
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <span>{provider?.name}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {provider?.priceUsdPer1k === 0 ? 'Kostenlos' : `$${provider?.priceUsdPer1k}/1k`}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={onVerify}
          disabled={isVerifying || !formData.modelId || !formData.openRouterKey}
          variant="outline"
          className="w-full border-slate-600 text-slate-300"
        >
          {isVerifying ? 'Teste...' : 'Modell testen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ModelSection;
