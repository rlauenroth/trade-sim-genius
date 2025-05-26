import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAppState } from '@/hooks/useAppState';
import { ApiKeys } from '@/types/appState';

const SetupWizard = () => {
  const [kucoinApiKey, setKucoinApiKey] = useState('');
  const [kucoinApiSecret, setKucoinApiSecret] = useState('');
  const [kucoinApiPassphrase, setKucoinApiPassphrase] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { saveApiKeys, checkSetupStatus } = useAppState();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Transform to new nested ApiKeys structure
      const apiKeysData: ApiKeys = {
        kucoin: {
          key: kucoinApiKey,
          secret: kucoinApiSecret,
          passphrase: kucoinApiPassphrase
        },
        openRouter: openRouterApiKey
      };

      const success = await saveApiKeys(apiKeysData);
      
      if (success) {
        // Mark that user has acknowledged the risk
        localStorage.setItem('kiTradingApp_userAcknowledgedRisk', 'true');
        
        toast({
          title: "Setup abgeschlossen!",
          description: "Ihre API-Schlüssel wurden erfolgreich gespeichert.",
        });
        
        // Check setup status to proceed
        checkSetupStatus();
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Fehler",
        description: "API-Schlüssel konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto lg:max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>KI Trading App einrichten</CardTitle>
          <CardDescription>
            Bitte gib deine API-Schlüssel ein, um fortzufahren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="kucoinApiKey">KuCoin API Key</Label>
              <Input
                id="kucoinApiKey"
                type="password"
                value={kucoinApiKey}
                onChange={(e) => setKucoinApiKey(e.target.value)}
                placeholder="KuCoin API Key"
              />
            </div>
            <div>
              <Label htmlFor="kucoinApiSecret">KuCoin API Secret</Label>
              <Input
                id="kucoinApiSecret"
                type="password"
                value={kucoinApiSecret}
                onChange={(e) => setKucoinApiSecret(e.target.value)}
                placeholder="KuCoin API Secret"
              />
            </div>
            <div>
              <Label htmlFor="kucoinApiPassphrase">KuCoin API Passphrase</Label>
              <Input
                id="kucoinApiPassphrase"
                type="password"
                value={kucoinApiPassphrase}
                onChange={(e) => setKucoinApiPassphrase(e.target.value)}
                placeholder="KuCoin API Passphrase"
              />
            </div>
            <div>
              <Label htmlFor="openRouterApiKey">OpenRouter API Key</Label>
              <Input
                id="openRouterApiKey"
                type="password"
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                placeholder="OpenRouter API Key"
              />
            </div>
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Einrichten..." : "Einrichten"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupWizard;
