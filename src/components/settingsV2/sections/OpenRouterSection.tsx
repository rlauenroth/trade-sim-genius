
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot } from 'lucide-react';
import VerificationBadge from '../VerificationBadge';
import { VerificationStatus } from '@/types/settingsV2';

interface OpenRouterSectionProps {
  formData: {
    openRouterKey: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  verificationStatus: VerificationStatus;
  verificationMessage?: string;
}

const OpenRouterSection = ({
  formData,
  onFieldChange,
  onVerify,
  isVerifying,
  verificationStatus,
  verificationMessage
}: OpenRouterSectionProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>OpenRouter API</span>
          </div>
          <VerificationBadge 
            status={verificationStatus} 
            message={verificationMessage}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-300">API Key</Label>
          <Input
            type="password"
            value={formData.openRouterKey}
            onChange={(e) => onFieldChange('openRouterKey', e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1"
            placeholder="OpenRouter API Key eingeben..."
          />
        </div>
        <Button
          onClick={onVerify}
          disabled={isVerifying || !formData.openRouterKey}
          variant="outline"
          className="w-full border-slate-600 text-slate-300"
        >
          {isVerifying ? 'Teste...' : 'Verbindung testen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OpenRouterSection;
