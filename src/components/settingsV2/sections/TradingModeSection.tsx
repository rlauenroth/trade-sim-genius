import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { RealTradingWarningModal } from '@/components/ui/real-trading';
import { useSettingsV2Store } from '@/stores/settingsV2';

interface TradingModeSectionProps {
  formData: any;
  onFieldChange: (field: string, value: any) => void;
}

const TradingModeSection = ({ formData, onFieldChange }: TradingModeSectionProps) => {
  const { settings } = useSettingsV2Store();
  const [isRealTradingModalOpen, setIsRealTradingModalOpen] = useState(false);

  const handleTradingModeChange = (checked: boolean) => {
    if (checked) {
      // Attempt to switch to real trading mode
      if (localStorage.getItem('kiTradingApp_skipTradeConfirmation') === 'true') {
        // Skip warning and directly enable real trading
        onFieldChange('tradingMode', 'real');
      } else {
        // Open the real trading warning modal
        setIsRealTradingModalOpen(true);
      }
    } else {
      // Switch back to simulation mode
      onFieldChange('tradingMode', 'simulation');
    }
  };

  const handleConfirmRealTrading = () => {
    onFieldChange('tradingMode', 'real');
    setIsRealTradingModalOpen(false);
  };

  const handleCloseRealTradingModal = () => {
    setIsRealTradingModalOpen(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Trading Mode</CardTitle>
        <CardDescription className="text-slate-400">
          Wählen Sie den Modus, in dem der Trading-Bot ausgeführt werden soll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="trading-mode" className="text-white">
              Real-Trading aktivieren
            </Label>
            <p className="text-sm text-slate-400">
              Im Real-Trading-Modus werden Trades mit echtem Kapital ausgeführt.
            </p>
            {settings.tradingMode === 'real' && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Real-Trading aktiv
              </Badge>
            )}
          </div>
          <Switch
            id="trading-mode"
            checked={settings.tradingMode === 'real'}
            onCheckedChange={handleTradingModeChange}
          />
        </div>

        {/* Risk Limits */}
        <div className="space-y-2">
          <h4 className="text-white font-semibold">Risiko-Limits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-open-orders" className="text-slate-300">
                Max. offene Orders
              </Label>
              <Input
                type="number"
                id="max-open-orders"
                value={formData.riskLimits?.maxOpenOrders || settings.riskLimits.maxOpenOrders}
                onChange={(e) => onFieldChange('riskLimits', { ...formData.riskLimits, maxOpenOrders: parseInt(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="max-exposure" className="text-slate-300">
                Max. Exposure (USD)
              </Label>
              <Input
                type="number"
                id="max-exposure"
                value={formData.riskLimits?.maxExposure || settings.riskLimits.maxExposure}
                onChange={(e) => onFieldChange('riskLimits', { ...formData.riskLimits, maxExposure: parseInt(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="min-balance" className="text-slate-300">
                Min. Balance (USD)
              </Label>
              <Input
                type="number"
                id="min-balance"
                value={formData.riskLimits?.minBalance || settings.riskLimits.minBalance}
                onChange={(e) => onFieldChange('riskLimits', { ...formData.riskLimits, minBalance: parseInt(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Real Trading Warning Modal */}
        <RealTradingWarningModal
          isOpen={isRealTradingModalOpen}
          onClose={handleCloseRealTradingModal}
          onConfirm={handleConfirmRealTrading}
        />
      </CardContent>
    </Card>
  );
};

export default TradingModeSection;
