
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { useSettingsForm } from './hooks/useSettingsForm';
import { useVerificationHandlers } from './hooks/useVerificationHandlers';
import { getVerificationStatus, getVerificationMessage } from './utils/verificationHelpers';
import KucoinSection from './sections/KucoinSection';
import OpenRouterSection from './sections/OpenRouterSection';
import ModelSection from './sections/ModelSection';
import ProxySection from './sections/ProxySection';
import TradingModeSection from './sections/TradingModeSection';
import StrategySection from './sections/StrategySection';
import { loggingService } from '@/services/loggingService';

interface SettingsDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
}

const SettingsDrawerV2 = ({ isOpen, onClose, isOnboarding = false }: SettingsDrawerV2Props) => {
  const { blocks, saveSettings, canSave, settings } = useSettingsV2Store();
  const { formData, handleFieldChange } = useSettingsForm();
  const verificationHandlers = useVerificationHandlers(formData);

  // Save handler with improved state management
  const handleSave = async () => {
    console.log('SettingsDrawerV2: Saving settings...', {
      isOnboarding,
      canSave: canSave(),
      currentTradingMode: settings.tradingMode,
      formDataTradingMode: formData.tradingMode
    });

    try {
      const success = await saveSettings();
      
      if (success) {
        loggingService.logEvent('SIM', 'Settings saved successfully', {
          isOnboarding,
          tradingMode: settings.tradingMode,
          riskLimits: settings.riskLimits
        });

        console.log('SettingsDrawerV2: Settings saved successfully');
        
        // Use a small delay to ensure state updates are complete
        setTimeout(() => {
          onClose();
        }, 100);
        
        if (isOnboarding) {
          console.log('SettingsDrawerV2: Onboarding completed, letting parent handle transition');
        } else {
          console.log('SettingsDrawerV2: Regular settings save, returning to dashboard');
        }
      } else {
        console.error('SettingsDrawerV2: Failed to save settings');
        loggingService.logError('Settings save failed', {
          isOnboarding,
          canSave: canSave()
        });
      }
    } catch (error) {
      console.error('SettingsDrawerV2: Error saving settings:', error);
      loggingService.logError('Settings save error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isOnboarding
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className={`bg-slate-900 border-slate-700 text-white overflow-y-auto ${
          isOnboarding ? 'w-full max-w-none' : 'w-[600px]'
        }`}
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center space-x-2 text-xl">
            <Settings className="h-6 w-6" />
            <span>{isOnboarding ? 'KI Trading App einrichten' : 'Einstellungen'}</span>
          </SheetTitle>
          {isOnboarding && (
            <SheetDescription className="text-slate-400">
              Bitte konfigurieren und verifizieren Sie alle Einstellungen, um fortzufahren.
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-6">
          <KucoinSection
            formData={formData}
            onFieldChange={handleFieldChange}
            onVerify={verificationHandlers.handleKucoinVerify}
            isVerifying={verificationHandlers.kucoinVerification.isVerifying}
            verificationStatus={getVerificationStatus('kucoin', blocks, verificationHandlers)}
            verificationMessage={getVerificationMessage('kucoin', verificationHandlers)}
          />

          <OpenRouterSection
            formData={formData}
            onFieldChange={handleFieldChange}
            onVerify={verificationHandlers.handleOpenRouterVerify}
            isVerifying={verificationHandlers.openRouterVerification.isVerifying}
            verificationStatus={getVerificationStatus('openRouter', blocks, verificationHandlers)}
            verificationMessage={getVerificationMessage('openRouter', verificationHandlers)}
          />

          <ModelSection
            formData={formData}
            onFieldChange={handleFieldChange}
            onVerify={verificationHandlers.handleModelVerify}
            isVerifying={verificationHandlers.modelVerification.isVerifying}
            verificationStatus={getVerificationStatus('model', blocks, verificationHandlers)}
            verificationMessage={getVerificationMessage('model', verificationHandlers)}
          />

          <ProxySection
            formData={formData}
            onFieldChange={handleFieldChange}
            onVerify={verificationHandlers.handleProxyVerify}
            isVerifying={verificationHandlers.proxyVerification.isVerifying}
            verificationStatus={getVerificationStatus('proxy', blocks, verificationHandlers)}
            verificationMessage={getVerificationMessage('proxy', verificationHandlers)}
          />

          <TradingModeSection
            formData={formData}
            onFieldChange={handleFieldChange}
          />

          <StrategySection
            formData={formData}
            onFieldChange={handleFieldChange}
          />
        </div>

        {/* Global Save Button */}
        <div className="sticky bottom-0 pt-6 pb-4 bg-slate-900 border-t border-slate-700 mt-6">
          <div className="flex space-x-4">
            {!isOnboarding && (
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300"
              >
                Abbrechen
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isOnboarding ? 'Setup abschließen' : 'Einstellungen speichern'}
            </Button>
          </div>
          {!canSave() && (
            <div className="text-xs text-slate-400 mt-2 text-center">
              Alle Blöcke müssen verifiziert werden, bevor gespeichert werden kann
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawerV2;
