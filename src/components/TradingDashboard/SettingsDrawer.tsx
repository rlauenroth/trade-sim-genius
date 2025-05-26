
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Wifi, Copy, X, Key, Bot, Shield, Palette } from 'lucide-react';
import { KUCOIN_PROXY_BASE } from '@/config';
import { useProxyConnection } from '@/hooks/useProxyConnection';
import { useSettingsStore } from '@/stores/settingsStore';
import { modelOptions } from '@/config/modelOptions';
import { ApiKeys, UserSettings } from '@/types/appState';
import { toast } from '@/hooks/use-toast';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const { isTestingProxy, proxyStatus, testConnection } = useProxyConnection();
  const { 
    apiKeys, 
    userSettings, 
    saveApiKeys, 
    saveSettings, 
    clearApiKeys,
    validateApiKeys,
    validateSettings 
  } = useSettingsStore();

  // Create safe default values for form data
  const createDefaultApiKeys = (): ApiKeys => ({
    kucoin: { key: '', secret: '', passphrase: '' },
    openRouter: ''
  });

  // Local form state with safe defaults
  const [formData, setFormData] = useState({
    apiKeys: apiKeys || createDefaultApiKeys(),
    settings: userSettings
  });

  const [validationErrors, setValidationErrors] = useState<{
    apiKeys: string[];
    settings: string[];
  }>({
    apiKeys: [],
    settings: []
  });

  // Update form when store changes
  useEffect(() => {
    setFormData({
      apiKeys: apiKeys || createDefaultApiKeys(),
      settings: userSettings
    });
  }, [apiKeys, userSettings]);

  const copyProxyUrl = () => {
    navigator.clipboard.writeText(KUCOIN_PROXY_BASE);
    toast({
      title: "URL kopiert",
      description: "Proxy-URL wurde in die Zwischenablage kopiert.",
    });
  };

  const getStatusBadge = () => {
    switch (proxyStatus) {
      case 'connected':
        return <Badge className="bg-green-600 text-white">Verbunden</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Fehler</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unbekannt</Badge>;
    }
  };

  const handleApiKeysChange = (field: string, value: string) => {
    if (field.startsWith('kucoin.')) {
      const kucoinField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          kucoin: {
            ...prev.apiKeys.kucoin,
            [kucoinField]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          [field]: value
        }
      }));
    }
  };

  const handleSettingsChange = (field: keyof UserSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Validate both API keys and settings
    const apiKeyErrors = validateApiKeys(formData.apiKeys);
    const settingsErrors = validateSettings(formData.settings);
    
    setValidationErrors({
      apiKeys: apiKeyErrors,
      settings: settingsErrors
    });

    if (apiKeyErrors.length > 0 || settingsErrors.length > 0) {
      return;
    }

    // Save API keys if they have values
    const hasApiKeys = formData.apiKeys.kucoin.key || formData.apiKeys.openRouter;
    if (hasApiKeys) {
      const apiKeysSaved = await saveApiKeys(formData.apiKeys);
      if (!apiKeysSaved) return;
    }

    // Save settings
    const settingsSaved = await saveSettings(formData.settings);
    if (!settingsSaved) return;

    // Close drawer on success
    onClose();
  };

  const handleClearApiKeys = () => {
    clearApiKeys();
    setFormData(prev => ({
      ...prev,
      apiKeys: createDefaultApiKeys()
    }));
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-slate-800 border-slate-700 max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Einstellungen</span>
          </DrawerTitle>
          <DrawerClose className="absolute right-4 top-4">
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 overflow-y-auto">
          {/* API Keys Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API-Schlüssel</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KuCoin API Keys */}
              <div className="space-y-3">
                <Label className="text-slate-300 font-medium">KuCoin API</Label>
                <div>
                  <Label className="text-slate-400 text-sm">API Key</Label>
                  <Input
                    value={formData.apiKeys.kucoin.key}
                    onChange={(e) => handleApiKeysChange('kucoin.key', e.target.value)}
                    placeholder="KuCoin API Key eingeben..."
                    className="bg-slate-800 border-slate-600 text-slate-200"
                    type="password"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">API Secret</Label>
                  <Input
                    value={formData.apiKeys.kucoin.secret}
                    onChange={(e) => handleApiKeysChange('kucoin.secret', e.target.value)}
                    placeholder="KuCoin API Secret eingeben..."
                    className="bg-slate-800 border-slate-600 text-slate-200"
                    type="password"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Passphrase</Label>
                  <Input
                    value={formData.apiKeys.kucoin.passphrase}
                    onChange={(e) => handleApiKeysChange('kucoin.passphrase', e.target.value)}
                    placeholder="KuCoin Passphrase eingeben..."
                    className="bg-slate-800 border-slate-600 text-slate-200"
                    type="password"
                  />
                </div>
              </div>

              {/* OpenRouter API Key */}
              <div>
                <Label className="text-slate-300 font-medium">OpenRouter API</Label>
                <Input
                  value={formData.apiKeys.openRouter}
                  onChange={(e) => handleApiKeysChange('openRouter', e.target.value)}
                  placeholder="OpenRouter API Key eingeben..."
                  className="bg-slate-800 border-slate-600 text-slate-200 mt-1"
                  type="password"
                />
              </div>

              {validationErrors.apiKeys.length > 0 && (
                <div className="bg-red-900/50 border border-red-600 p-3 rounded">
                  <div className="text-red-200 text-sm space-y-1">
                    {validationErrors.apiKeys.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={handleClearApiKeys}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                >
                  Alle löschen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trading Strategy Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Trading-Strategie</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.settings.tradingStrategy}
                onValueChange={(value) => handleSettingsChange('tradingStrategy', value as any)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conservative" id="conservative" />
                  <Label htmlFor="conservative" className="text-slate-300">
                    Konservativ - Sicherheit steht im Vordergrund
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced" className="text-slate-300">
                    Ausgewogen - Balance zwischen Risiko und Ertrag
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aggressive" id="aggressive" />
                  <Label htmlFor="aggressive" className="text-slate-300">
                    Aggressiv - Höhere Rendite bei mehr Risiko
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* AI Model Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>KI-Modell</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.settings.selectedAiModelId}
                onValueChange={(value) => handleSettingsChange('selectedAiModelId', value)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Modell auswählen..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {modelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-slate-200">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span>{model.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {model.provider}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">
                          {model.priceHint} • {model.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Network & Proxy Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Wifi className="h-5 w-5" />
                <span>Netzwerk & Proxy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Proxy-Status</Label>
                <div className="flex items-center justify-between mt-1">
                  {getStatusBadge()}
                  <Button
                    onClick={testConnection}
                    disabled={isTestingProxy}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    {isTestingProxy ? 'Teste...' : 'Verbindung testen'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Proxy-URL</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={formData.settings.proxyUrl}
                    onChange={(e) => handleSettingsChange('proxyUrl', e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-200 text-sm"
                  />
                  <Button
                    onClick={copyProxyUrl}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Alle KuCoin-API-Aufrufe werden über diesen Proxy geleitet.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Design & Sprache</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Design</Label>
                <Select
                  value={formData.settings.theme}
                  onValueChange={(value) => handleSettingsChange('theme', value as any)}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="dark" className="text-slate-200">Dunkel</SelectItem>
                    <SelectItem value="light" className="text-slate-200">Hell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Sprache</Label>
                <Select
                  value={formData.settings.language}
                  onValueChange={(value) => handleSettingsChange('language', value as any)}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="de" className="text-slate-200">Deutsch</SelectItem>
                    <SelectItem value="en" className="text-slate-200">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {validationErrors.settings.length > 0 && (
            <div className="bg-red-900/50 border border-red-600 p-3 rounded">
              <div className="text-red-200 text-sm space-y-1">
                {validationErrors.settings.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="flex space-x-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Speichern & Schließen
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
