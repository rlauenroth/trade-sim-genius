
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Key, Bot, Wifi, Shield, DollarSign } from 'lucide-react';
import { useSettingsV2Store } from '@/stores/settingsV2Store';
import { useKucoinVerification } from '@/hooks/useKucoinVerification';
import { useOpenRouterVerification } from '@/hooks/useOpenRouterVerification';
import { useModelVerification } from '@/hooks/useModelVerification';
import { useProxyVerification } from '@/hooks/useProxyVerification';
import { modelProviderService } from '@/services/settingsV2/modelProviderService';
import VerificationBadge from './VerificationBadge';

interface SettingsDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
}

const SettingsDrawerV2 = ({ isOpen, onClose, isOnboarding = false }: SettingsDrawerV2Props) => {
  const { 
    settings, 
    blocks, 
    updateBlock, 
    markBlockVerified, 
    saveSettings, 
    canSave 
  } = useSettingsV2Store();

  // Verification hooks
  const kucoinVerification = useKucoinVerification();
  const openRouterVerification = useOpenRouterVerification();
  const modelVerification = useModelVerification();
  const proxyVerification = useProxyVerification();

  // Form state
  const [formData, setFormData] = useState({
    kucoinKey: '',
    kucoinSecret: '',
    kucoinPassphrase: '',
    openRouterKey: '',
    modelId: '',
    proxyUrl: ''
  });

  // Initialize form data from settings
  useEffect(() => {
    setFormData({
      kucoinKey: settings.kucoin.key,
      kucoinSecret: settings.kucoin.secret,
      kucoinPassphrase: settings.kucoin.passphrase,
      openRouterKey: settings.openRouter.apiKey,
      modelId: settings.model.id,
      proxyUrl: settings.proxyUrl
    });
  }, [settings]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update store and mark block as modified
    if (field.startsWith('kucoin')) {
      const kucoinField = field.replace('kucoin', '').toLowerCase();
      updateBlock('kucoin', {
        kucoin: {
          ...settings.kucoin,
          [kucoinField === 'key' ? 'key' : kucoinField === 'secret' ? 'secret' : 'passphrase']: value
        }
      });
    } else if (field === 'openRouterKey') {
      updateBlock('openRouter', {
        openRouter: { ...settings.openRouter, apiKey: value }
      });
    } else if (field === 'modelId') {
      const provider = modelProviderService.getOptimalProvider(value);
      if (provider) {
        updateBlock('model', {
          model: {
            id: value,
            provider: provider.name,
            priceUsdPer1k: provider.priceUsdPer1k,
            latencyMs: provider.latencyMs,
            verified: false
          }
        });
      }
    } else if (field === 'proxyUrl') {
      updateBlock('proxy', { proxyUrl: value });
    }
  };

  // Verification handlers
  const handleKucoinVerify = async () => {
    kucoinVerification.reset();
    const success = await kucoinVerification.verify(
      formData.kucoinKey,
      formData.kucoinSecret,
      formData.kucoinPassphrase
    );
    markBlockVerified('kucoin', success);
  };

  const handleOpenRouterVerify = async () => {
    openRouterVerification.reset();
    const success = await openRouterVerification.verify(formData.openRouterKey);
    markBlockVerified('openRouter', success);
  };

  const handleModelVerify = async () => {
    modelVerification.reset();
    const success = await modelVerification.verify(formData.modelId, formData.openRouterKey);
    markBlockVerified('model', success);
  };

  const handleProxyVerify = async () => {
    proxyVerification.reset();
    const success = await proxyVerification.verify(formData.proxyUrl);
    markBlockVerified('proxy', success);
  };

  // Save handler
  const handleSave = async () => {
    const success = await saveSettings();
    if (success && isOnboarding) {
      // Redirect to dashboard after successful onboarding
      window.location.href = '/';
    } else if (success) {
      onClose();
    }
  };

  // Get verification status for each block
  const getVerificationStatus = (blockName: string) => {
    if (blocks[blockName]?.verified) return 'success';
    
    switch (blockName) {
      case 'kucoin':
        return kucoinVerification.isVerifying ? 'testing' : kucoinVerification.result.status;
      case 'openRouter':
        return openRouterVerification.isVerifying ? 'testing' : openRouterVerification.result.status;
      case 'model':
        return modelVerification.isVerifying ? 'testing' : modelVerification.result.status;
      case 'proxy':
        return proxyVerification.isVerifying ? 'testing' : proxyVerification.result.status;
      default:
        return 'untested';
    }
  };

  const getVerificationMessage = (blockName: string) => {
    switch (blockName) {
      case 'kucoin':
        return kucoinVerification.result.message;
      case 'openRouter':
        return openRouterVerification.result.message;
      case 'model':
        return modelVerification.result.message;
      case 'proxy':
        return proxyVerification.result.message;
      default:
        return undefined;
    }
  };

  const availableModels = modelProviderService.getAllModels();

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
          {/* KuCoin API Keys Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>KuCoin API</span>
                </div>
                <VerificationBadge 
                  status={getVerificationStatus('kucoin')} 
                  message={getVerificationMessage('kucoin')}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">API Key</Label>
                <Input
                  type="password"
                  value={formData.kucoinKey}
                  onChange={(e) => handleFieldChange('kucoinKey', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                  placeholder="KuCoin API Key eingeben..."
                />
              </div>
              <div>
                <Label className="text-slate-300">API Secret</Label>
                <Input
                  type="password"
                  value={formData.kucoinSecret}
                  onChange={(e) => handleFieldChange('kucoinSecret', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                  placeholder="KuCoin API Secret eingeben..."
                />
              </div>
              <div>
                <Label className="text-slate-300">Passphrase</Label>
                <Input
                  type="password"
                  value={formData.kucoinPassphrase}
                  onChange={(e) => handleFieldChange('kucoinPassphrase', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                  placeholder="KuCoin Passphrase eingeben..."
                />
              </div>
              <Button
                onClick={handleKucoinVerify}
                disabled={kucoinVerification.isVerifying || !formData.kucoinKey}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                {kucoinVerification.isVerifying ? 'Teste...' : 'Verbindung testen'}
              </Button>
            </CardContent>
          </Card>

          {/* OpenRouter API Key Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>OpenRouter API</span>
                </div>
                <VerificationBadge 
                  status={getVerificationStatus('openRouter')} 
                  message={getVerificationMessage('openRouter')}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">API Key</Label>
                <Input
                  type="password"
                  value={formData.openRouterKey}
                  onChange={(e) => handleFieldChange('openRouterKey', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                  placeholder="OpenRouter API Key eingeben..."
                />
              </div>
              <Button
                onClick={handleOpenRouterVerify}
                disabled={openRouterVerification.isVerifying || !formData.openRouterKey}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                {openRouterVerification.isVerifying ? 'Teste...' : 'Verbindung testen'}
              </Button>
            </CardContent>
          </Card>

          {/* AI Model Selection Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>KI-Modell</span>
                </div>
                <VerificationBadge 
                  status={getVerificationStatus('model')} 
                  message={getVerificationMessage('model')}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Modell auswählen</Label>
                <Select
                  value={formData.modelId}
                  onValueChange={(value) => handleFieldChange('modelId', value)}
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
                onClick={handleModelVerify}
                disabled={modelVerification.isVerifying || !formData.modelId || !formData.openRouterKey}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                {modelVerification.isVerifying ? 'Teste...' : 'Modell testen'}
              </Button>
            </CardContent>
          </Card>

          {/* Proxy Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5" />
                  <span>Proxy (Optional)</span>
                </div>
                <VerificationBadge 
                  status={getVerificationStatus('proxy')} 
                  message={getVerificationMessage('proxy')}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Proxy URL</Label>
                <Input
                  value={formData.proxyUrl}
                  onChange={(e) => handleFieldChange('proxyUrl', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                  placeholder="https://proxy.example.com (optional)"
                />
                <div className="text-xs text-slate-400 mt-1">
                  Optional: Proxy-Server für KuCoin-API-Aufrufe
                </div>
              </div>
              <Button
                onClick={handleProxyVerify}
                disabled={proxyVerification.isVerifying}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                {proxyVerification.isVerifying ? 'Teste...' : 'Proxy testen'}
              </Button>
            </CardContent>
          </Card>
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
