
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi } from 'lucide-react';
import VerificationBadge from '../VerificationBadge';
import { VerificationStatus } from '@/types/settingsV2';

interface ProxySectionProps {
  formData: {
    proxyUrl: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  verificationStatus: VerificationStatus;
  verificationMessage?: string;
}

const ProxySection = ({
  formData,
  onFieldChange,
  onVerify,
  isVerifying,
  verificationStatus,
  verificationMessage
}: ProxySectionProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Proxy (Optional)</span>
          </div>
          <VerificationBadge 
            status={verificationStatus} 
            message={verificationMessage}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-300">Proxy URL</Label>
          <Input
            value={formData.proxyUrl}
            onChange={(e) => onFieldChange('proxyUrl', e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1"
            placeholder="https://proxy.example.com (optional)"
          />
          <div className="text-xs text-slate-400 mt-1">
            Optional: Proxy-Server für KuCoin-API-Aufrufe
          </div>
        </div>
        <Button
          onClick={onVerify}
          disabled={isVerifying}
          variant="outline"
          className="w-full border-slate-600 text-slate-300"
        >
          {isVerifying ? 'Teste...' : 'Proxy testen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProxySection;
