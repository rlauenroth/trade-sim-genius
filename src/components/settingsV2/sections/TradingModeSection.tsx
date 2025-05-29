
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { RealTradingWarningModal } from '@/components/ui/real-trading';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { loggingService } from '@/services/loggingService';

interface TradingModeSectionProps {
  formData: any;
  onFieldChange: (field: string, value: any) => void;
}

const TradingModeSection = ({ formData, onFieldChange }: TradingModeSectionProps) => {
  const { settings, updateBlock } = useSettingsV2Store();
  const [isRealTradingModalOpen, setIsRealTradingModalOpen] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Ensure riskLimits are properly initialized
  useEffect(() => {
    try {
      if (!formData.riskLimits || Object.keys(formData.riskLimits).length === 0) {
        const defaultRiskLimits = {
          maxOpenOrders: settings.riskLimits.maxOpenOrders || 5,
          maxExposure: settings.riskLimits.maxExposure || 1000,
          minBalance: settings.riskLimits.minBalance || 50,
          requireConfirmation: settings.riskLimits.requireConfirmation ?? true
        };
        
        loggingService.logEvent('SETTINGS', 'Risk limits initialized', {
          defaultRiskLimits,
          tradingMode: formData.tradingMode || settings.tradingMode
        });
        
        onFieldChange('riskLimits', defaultRiskLimits);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setInitializationError(errorMessage);
      loggingService.logError('Risk limits initialization failed', { error: errorMessage });
    }
  }, [formData.riskLimits, settings.riskLimits, onFieldChange]);

  const handleTradingModeChange = (checked: boolean) => {
    try {
      if (checked) {
        // Validate that risk limits are properly set before enabling real trading
        const currentRiskLimits = formData.riskLimits || settings.riskLimits;
        
        if (!currentRiskLimits || typeof currentRiskLimits.maxOpenOrders !== 'number') {
          throw new Error('Risk limits nicht korrekt initialisiert');
        }
        
        // Attempt to switch to real trading mode
        if (localStorage.getItem('kiTradingApp_skipTradeConfirmation') === 'true') {
          // Skip warning and directly enable real trading
          onFieldChange('tradingMode', 'real');
          
          // Update the settings store as well
          updateBlock('trading', { tradingMode: 'real' });
          
          loggingService.logEvent('SETTINGS', 'Real trading mode enabled', {
            skippedWarning: true,
            riskLimits: currentRiskLimits
          });
        } else {
          // Open the real trading warning modal
          setIsRealTradingModalOpen(true);
        }
      } else {
        // Switch back to simulation mode
        onFieldChange('tradingMode', 'simulation');
        updateBlock('trading', { tradingMode: 'simulation' });
        
        loggingService.logEvent('SETTINGS', 'Switched back to simulation mode');
      }
      
      // Clear any previous initialization errors
      setInitializationError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setInitializationError(errorMessage);
      loggingService.logError('Trading mode change failed', { error: errorMessage, checked });
    }
  };

  const handleConfirmRealTrading = () => {
    try {
      onFieldChange('tradingMode', 'real');
      updateBlock('trading', { tradingMode: 'real' });
      setIsRealTradingModalOpen(false);
      
      loggingService.logEvent('SETTINGS', 'Real trading mode confirmed via modal', {
        riskLimits: formData.riskLimits || settings.riskLimits
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setInitializationError(errorMessage);
      loggingService.logError('Real trading confirmation failed', { error: errorMessage });
    }
  };

  const handleCloseRealTradingModal = () => {
    setIsRealTradingModalOpen(false);
  };

  const handleRiskLimitChange = (field: string, value: number) => {
    try {
      const updatedRiskLimits = {
        ...(formData.riskLimits || settings.riskLimits),
        [field]: value
      };
      
      onFieldChange('riskLimits', updatedRiskLimits);
      
      // Also update the settings store
      updateBlock('trading', { riskLimits: updatedRiskLimits });
      
      loggingService.logEvent('SETTINGS', 'Risk limit updated', {
        field,
        value,
        updatedRiskLimits
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setInitializationError(errorMessage);
      loggingService.logError('Risk limit update failed', { error: errorMessage, field, value });
    }
  };

  // Safe access to current values with fallbacks
  const currentTradingMode = formData.tradingMode || settings.tradingMode || 'simulation';
  const currentRiskLimits = formData.riskLimits || settings.riskLimits || {
    maxOpenOrders: 5,
    maxExposure: 1000,
    minBalance: 50,
    requireConfirmation: true
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Trading Mode</CardTitle>
        <CardDescription className="text-slate-400">
          Wählen Sie den Modus, in dem der Trading-Bot ausgeführt werden soll.
        </CardDescription>
        {initializationError && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Initialisierungsfehler:</span>
            </div>
            <p className="text-red-300 text-sm mt-1">{initializationError}</p>
          </div>
        )}
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
            {currentTradingMode === 'real' && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Real-Trading aktiv
              </Badge>
            )}
          </div>
          <Switch
            id="trading-mode"
            checked={currentTradingMode === 'real'}
            onCheckedChange={handleTradingModeChange}
            disabled={!!initializationError}
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
                value={currentRiskLimits.maxOpenOrders}
                onChange={(e) => handleRiskLimitChange('maxOpenOrders', parseInt(e.target.value) || 5)}
                className="bg-slate-700 border-slate-600 text-white"
                min="1"
                max="50"
              />
            </div>
            <div>
              <Label htmlFor="max-exposure" className="text-slate-300">
                Max. Exposure (USD)
              </Label>
              <Input
                type="number"
                id="max-exposure"
                value={currentRiskLimits.maxExposure}
                onChange={(e) => handleRiskLimitChange('maxExposure', parseInt(e.target.value) || 1000)}
                className="bg-slate-700 border-slate-600 text-white"
                min="100"
                max="100000"
              />
            </div>
            <div>
              <Label htmlFor="min-balance" className="text-slate-300">
                Min. Balance (USD)
              </Label>
              <Input
                type="number"
                id="min-balance"
                value={currentRiskLimits.minBalance}
                onChange={(e) => handleRiskLimitChange('minBalance', parseInt(e.target.value) || 50)}
                className="bg-slate-700 border-slate-600 text-white"
                min="10"
                max="10000"
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
