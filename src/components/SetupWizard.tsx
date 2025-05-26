
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Eye, EyeOff, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { toast } from '@/hooks/use-toast';

const SetupWizard = () => {
  const { currentStep, setCurrentStep, saveApiKeys, saveUserSettings, isLoading } = useAppState();
  const [showPasswords, setShowPasswords] = useState(false);
  const [formData, setFormData] = useState({
    kucoinApiKey: '',
    kucoinApiSecret: '',
    kucoinApiPassphrase: '',
    openRouterApiKey: '',
    securityPassword: '',
    securityPasswordConfirm: '',
    tradingStrategy: 'balanced' as const,
    selectedAiModelId: 'anthropic/claude-3.5-sonnet'
  });

  const steps = [
    'Willkommen',
    'KuCoin API',
    'OpenRouter API', 
    'Sicherheitspasswort',
    'Strategieauswahl',
    'Abschluss'
  ];

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return formData.kucoinApiKey && formData.kucoinApiSecret && formData.kucoinApiPassphrase;
      case 2:
        return formData.openRouterApiKey;
      case 3:
        return formData.securityPassword.length >= 8 && 
               formData.securityPassword === formData.securityPasswordConfirm;
      case 4:
        return formData.tradingStrategy && formData.selectedAiModelId;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Unvollständige Eingaben",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive"
      });
      return;
    }

    if (currentStep === 4) {
      // Final step: save everything
      const apiKeys = {
        kucoinApiKey: formData.kucoinApiKey,
        kucoinApiSecret: formData.kucoinApiSecret,
        kucoinApiPassphrase: formData.kucoinApiPassphrase,
        openRouterApiKey: formData.openRouterApiKey
      };

      const success = await saveApiKeys(apiKeys, formData.securityPassword);
      if (success) {
        saveUserSettings({
          tradingStrategy: formData.tradingStrategy,
          selectedAiModelId: formData.selectedAiModelId
        });
        setCurrentStep(5);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Willkommen beim KI Trading Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold text-amber-400">Wichtige Hinweise</h3>
                </div>
                <ul className="text-amber-200 text-sm space-y-1">
                  <li>• Dies ist ein MVP für Paper-Trading (Simulation)</li>
                  <li>• Ihre API-Schlüssel werden lokal verschlüsselt gespeichert</li>
                  <li>• Kein echter Handel - nur Signaltesting</li>
                  <li>• Verwenden Sie starke, einzigartige Passwörter</li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-slate-300 mb-4">
                  Lassen Sie uns Ihre Handelsumgebung einrichten. 
                  Der Prozess dauert nur wenige Minuten.
                </p>
                <Button onClick={() => setCurrentStep(1)} className="bg-blue-600 hover:bg-blue-700">
                  Einrichtung starten
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">KuCoin API-Schlüssel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-4">
                <p className="text-blue-200 text-sm">
                  Erstellen Sie API-Schlüssel in Ihrem KuCoin-Konto mit den Berechtigungen: 
                  <strong> Portfolio lesen, Handel</strong>
                </p>
              </div>
              
              <div>
                <Label htmlFor="kucoinApiKey" className="text-slate-300">API Key</Label>
                <Input
                  id="kucoinApiKey"
                  type="text"
                  value={formData.kucoinApiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, kucoinApiKey: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ihr KuCoin API Key"
                />
              </div>
              
              <div>
                <Label htmlFor="kucoinApiSecret" className="text-slate-300">API Secret</Label>
                <div className="relative">
                  <Input
                    id="kucoinApiSecret"
                    type={showPasswords ? "text" : "password"}
                    value={formData.kucoinApiSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, kucoinApiSecret: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    placeholder="Ihr KuCoin API Secret"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="kucoinApiPassphrase" className="text-slate-300">API Passphrase</Label>
                <Input
                  id="kucoinApiPassphrase"
                  type={showPasswords ? "text" : "password"}
                  value={formData.kucoinApiPassphrase}
                  onChange={(e) => setFormData(prev => ({ ...prev, kucoinApiPassphrase: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ihre KuCoin API Passphrase"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">OpenRouter API-Schlüssel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-4">
                <p className="text-blue-200 text-sm">
                  Erstellen Sie einen API-Schlüssel bei OpenRouter.ai für den Zugriff auf KI-Modelle.
                </p>
              </div>
              
              <div>
                <Label htmlFor="openRouterApiKey" className="text-slate-300">OpenRouter API Key</Label>
                <Input
                  id="openRouterApiKey"
                  type={showPasswords ? "text" : "password"}
                  value={formData.openRouterApiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, openRouterApiKey: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ihr OpenRouter API Key"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Sicherheitspasswort erstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h3 className="font-semibold text-red-400">Wichtiger Hinweis</h3>
                </div>
                <p className="text-red-200 text-sm">
                  Dieses Passwort ist <strong>nicht wiederherstellbar</strong>. 
                  Merken Sie es sich gut oder bewahren Sie es sicher auf!
                </p>
              </div>
              
              <div>
                <Label htmlFor="securityPassword" className="text-slate-300">Sicherheitspasswort</Label>
                <Input
                  id="securityPassword"
                  type="password"
                  value={formData.securityPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, securityPassword: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              
              <div>
                <Label htmlFor="securityPasswordConfirm" className="text-slate-300">Passwort bestätigen</Label>
                <Input
                  id="securityPasswordConfirm"
                  type="password"
                  value={formData.securityPasswordConfirm}
                  onChange={(e) => setFormData(prev => ({ ...prev, securityPasswordConfirm: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Passwort wiederholen"
                />
              </div>
              
              {formData.securityPassword && (
                <div className="text-sm">
                  <div className={`flex items-center space-x-2 ${
                    formData.securityPassword.length >= 8 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Mindestens 8 Zeichen</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${
                    formData.securityPassword === formData.securityPasswordConfirm && formData.securityPasswordConfirm
                      ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Passwörter stimmen überein</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Handelsstrategie auswählen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-slate-300">Handelsstrategie</Label>
                <Select value={formData.tradingStrategy} onValueChange={(value: any) => 
                  setFormData(prev => ({ ...prev, tradingStrategy: value }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Konservativ (2% Position, -2% Stop)</SelectItem>
                    <SelectItem value="balanced">Ausgewogen (5% Position, -4% Stop)</SelectItem>
                    <SelectItem value="aggressive">Aggressiv (8% Position, -6% Stop)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-slate-300">KI-Modell</Label>
                <Select value={formData.selectedAiModelId} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, selectedAiModelId: value }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Empfohlen)</SelectItem>
                    <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="google/gemini-1.5-pro-preview">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku (Schnell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Einrichtung abgeschlossen!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Willkommen!</h3>
                <p className="text-slate-300">
                  Ihre API-Schlüssel wurden sicher verschlüsselt und gespeichert. 
                  Sie können jetzt mit dem Paper-Trading beginnen.
                </p>
              </div>
              
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <p className="text-green-200 text-sm">
                  Die App ist jetzt einsatzbereit. Alle Trades werden simuliert - 
                  kein echtes Geld ist gefährdet.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-600 text-slate-300'
              }`}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-24 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-slate-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      {currentStep > 0 && currentStep < 5 && (
        <div className="flex justify-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(currentStep - 1)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!validateCurrentStep() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === 4 ? 'Abschließen' : 'Weiter'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SetupWizard;
