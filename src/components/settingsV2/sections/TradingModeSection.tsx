
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Shield, DollarSign } from 'lucide-react';
import { RealTradingWarningModal } from '@/components/ui/real-trading-modals';

interface TradingModeSectionProps {
  formData: any;
  onFieldChange: (field: string, value: any) => void;
}

const TradingModeSection = ({ formData, onFieldChange }: TradingModeSectionProps) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingRealMode, setPendingRealMode] = useState(false);

  const isRealMode = formData.tradingMode === 'real';

  const handleTradingModeChange = (enabled: boolean) => {
    if (enabled && !isRealMode) {
      // Show warning modal before enabling real mode
      setPendingRealMode(true);
      setShowWarningModal(true);
    } else {
      // Switching to simulation mode - no warning needed
      onFieldChange('tradingMode', 'simulation');
    }
  };

  const handleConfirmRealMode = () => {
    onFieldChange('tradingMode', 'real');
    setPendingRealMode(false);
  };

  const handleCancelRealMode = () => {
    setPendingRealMode(false);
  };

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Trading Modus</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Wählen Sie zwischen Simulation und realem Handel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trading Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white">Trading Modus</Label>
              <p className="text-sm text-slate-400">
                {isRealMode ? 'Echter Handel mit realem Kapital' : 'Simulation ohne echtes Geld'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-400">Simulation</span>
              <Switch
                checked={isRealMode}
                onCheckedChange={handleTradingModeChange}
                className="data-[state=checked]:bg-red-600"
              />
              <span className="text-sm text-slate-400">Real</span>
            </div>
          </div>

          {/* Current Mode Alert */}
          <Alert className={isRealMode ? "bg-red-900/50 border-red-600" : "bg-green-900/50 border-green-600"}>
            {isRealMode ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            <AlertDescription className={isRealMode ? "text-red-200" : "text-green-200"}>
              <strong>Aktuell aktiv:</strong> {isRealMode ? 'Real-Trading Modus' : 'Simulations-Modus'}
              {isRealMode && ' - Alle Trades werden mit echtem Kapital ausgeführt!'}
            </AlertDescription>
          </Alert>

          {/* Risk Limits (only show in real mode) */}
          {isRealMode && (
            <>
              <Separator className="bg-slate-600" />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                  <Label className="text-white">Risiko-Limits</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Max. offene Orders</Label>
                    <Input
                      type="number"
                      value={formData.riskLimits?.maxOpenOrders || 5}
                      onChange={(e) => onFieldChange('riskLimits', {
                        ...formData.riskLimits,
                        maxOpenOrders: parseInt(e.target.value) || 5
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                      min="1"
                      max="20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Max. Exposure (USD)</Label>
                    <Input
                      type="number"
                      value={formData.riskLimits?.maxExposure || 1000}
                      onChange={(e) => onFieldChange('riskLimits', {
                        ...formData.riskLimits,
                        maxExposure: parseInt(e.target.value) || 1000
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                      min="100"
                      step="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Min. Balance (USDT)</Label>
                    <Input
                      type="number"
                      value={formData.riskLimits?.minBalance || 50}
                      onChange={(e) => onFieldChange('riskLimits', {
                        ...formData.riskLimits,
                        minBalance: parseInt(e.target.value) || 50
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                      min="10"
                      step="10"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.riskLimits?.requireConfirmation !== false}
                      onCheckedChange={(checked) => onFieldChange('riskLimits', {
                        ...formData.riskLimits,
                        requireConfirmation: checked
                      })}
                    />
                    <Label className="text-sm text-slate-300">Trade-Bestätigung erforderlich</Label>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Warning Modal */}
      <RealTradingWarningModal
        isOpen={showWarningModal}
        onClose={() => {
          setShowWarningModal(false);
          handleCancelRealMode();
        }}
        onConfirm={() => {
          setShowWarningModal(false);
          handleConfirmRealMode();
        }}
      />
    </>
  );
};

export default TradingModeSection;
