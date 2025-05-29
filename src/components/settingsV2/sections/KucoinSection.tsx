
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key } from 'lucide-react';
import VerificationBadge from '../VerificationBadge';
import { VerificationStatus } from '@/types/settingsV2';

interface KucoinSectionProps {
  formData: {
    kucoinKey: string;
    kucoinSecret: string;
    kucoinPassphrase: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  verificationStatus: VerificationStatus;
  verificationMessage?: string;
}

const KucoinSection = ({
  formData,
  onFieldChange,
  onVerify,
  isVerifying,
  verificationStatus,
  verificationMessage
}: KucoinSectionProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>KuCoin API</span>
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
            value={formData.kucoinKey}
            onChange={(e) => onFieldChange('kucoinKey', e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1"
            placeholder="KuCoin API Key eingeben..."
          />
        </div>
        <div>
          <Label className="text-slate-300">API Secret</Label>
          <Input
            type="password"
            value={formData.kucoinSecret}
            onChange={(e) => onFieldChange('kucoinSecret', e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1"
            placeholder="KuCoin API Secret eingeben..."
          />
        </div>
        <div>
          <Label className="text-slate-300">Passphrase</Label>
          <Input
            type="password"
            value={formData.kucoinPassphrase}
            onChange={(e) => onFieldChange('kucoinPassphrase', e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1"
            placeholder="KuCoin Passphrase eingeben..."
          />
        </div>
        <Button
          onClick={onVerify}
          disabled={isVerifying || !formData.kucoinKey}
          variant="outline"
          className="w-full border-slate-600 text-slate-300"
        >
          {isVerifying ? 'Teste...' : 'Verbindung testen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default KucoinSection;
