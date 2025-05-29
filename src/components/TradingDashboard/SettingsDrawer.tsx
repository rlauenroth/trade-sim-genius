import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Settings, CheckCircle, XCircle } from 'lucide-react';
import { RealTradingWarningModal } from '@/components/ui/real-trading';
import { toast } from '@/hooks/use-toast';
import { UserSettings } from '@/types/appState';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onSaveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
}

const SettingsDrawer = ({ isOpen, onClose, userSettings, onSaveSettings }: SettingsDrawerProps) => {
  const [apiKey, setApiKey] = React.useState(userSettings?.openRouterApiKey || '');
  const [proxyUrl, setProxyUrl] = React.useState(userSettings?.proxyUrl || '');
  const [selectedAiModelId, setSelectedAiModelId] = React.useState(userSettings?.selectedAiModelId || 'anthropic/claude-3-opus');
  const [tradingStrategy, setTradingStrategy] = React.useState(userSettings?.tradingStrategy || 'balanced');
  const [isRealTradingEnabled, setIsRealTradingEnabled] = React.useState(userSettings?.isRealTradingEnabled || false);
  const [maxConcurrentTrades, setMaxConcurrentTrades] = React.useState(userSettings?.maxConcurrentTrades || 3);
  const [tradeAllBalance, setTradeAllBalance] = React.useState(userSettings?.tradeAllBalance || false);
  const [maxUsdPerTrade, setMaxUsdPerTrade] = React.useState(userSettings?.maxUsdPerTrade || 100);
  const [isRealTradingWarningOpen, setIsRealTradingWarningOpen] = React.useState(false);

  const handleSaveSettings = async () => {
    const settingsToSave: Partial<UserSettings> = {
      openRouterApiKey: apiKey,
      proxyUrl,
      selectedAiModelId,
      tradingStrategy,
      isRealTradingEnabled,
      maxConcurrentTrades,
      tradeAllBalance,
      maxUsdPerTrade
    };

    const success = await onSaveSettings(settingsToSave);
    if (success) {
      onClose();
    }
  };

  const handleRealTradingToggle = () => {
    if (!isRealTradingEnabled) {
      setIsRealTradingWarningOpen(true);
    } else {
      setIsRealTradingEnabled(false);
    }
  };

  const confirmRealTrading = () => {
    setIsRealTradingEnabled(true);
    setIsRealTradingWarningOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="bg-slate-900 border-slate-700 text-white w-[600px]">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center space-x-2 text-xl">
            <Settings className="h-6 w-6" />
            <span>Einstellungen</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* OpenRouter API Key */}
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter API Key</CardTitle>
              <CardDescription>
                Geben Sie Ihren OpenRouter API-Schlüssel ein, um die KI-Funktionen zu aktivieren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proxy URL */}
          <Card>
            <CardHeader>
              <CardTitle>Proxy URL</CardTitle>
              <CardDescription>
                Geben Sie Ihre Proxy-URL ein, um die Verbindung zu KuCoin herzustellen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="proxy-url">Proxy URL</Label>
                  <Input id="proxy-url" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle>KI Modell</CardTitle>
              <CardDescription>
                Wählen Sie das KI-Modell aus, das für die Analyse verwendet werden soll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="ai-model">KI Modell</Label>
                  <Select value={selectedAiModelId} onValueChange={setSelectedAiModelId}>
                    <SelectTrigger id="ai-model">
                      <SelectValue placeholder="Wähle ein KI Modell" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic/claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="anthropic/claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="google/gemini-1.5-pro-latest">Gemini 1.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Strategy Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Strategie</CardTitle>
              <CardDescription>
                Wählen Sie die Trading-Strategie aus, die für die Simulation verwendet werden soll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="trading-strategy">Trading Strategie</Label>
                  <Select value={tradingStrategy} onValueChange={setTradingStrategy}>
                    <SelectTrigger id="trading-strategy">
                      <SelectValue placeholder="Wähle eine Strategie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Konservativ</SelectItem>
                      <SelectItem value="balanced">Ausgewogen</SelectItem>
                      <SelectItem value="aggressive">Aggressiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real Trading Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Real Trading Modus
                {isRealTradingEnabled && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Aktiviert
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Aktiviere den Real Trading Modus, um mit echtem Geld zu handeln.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="real-trading">Real Trading aktivieren</Label>
                  <Switch id="real-trading" checked={isRealTradingEnabled} onCheckedChange={handleRealTradingToggle} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Max Concurrent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Maximale Anzahl gleichzeitiger Trades</CardTitle>
              <CardDescription>
                Geben Sie die maximale Anzahl gleichzeitiger Trades ein.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="max-concurrent-trades">Maximale Anzahl</Label>
                  <Input
                    id="max-concurrent-trades"
                    type="number"
                    value={maxConcurrentTrades}
                    onChange={(e) => setMaxConcurrentTrades(parseInt(e.target.value))}
                    placeholder="3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade All Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Gesamtes Guthaben für jeden Trade verwenden</CardTitle>
              <CardDescription>
                Aktiviere diese Option, um das gesamte verfügbare Guthaben für jeden Trade zu verwenden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trade-all-balance">Gesamtes Guthaben verwenden</Label>
                  <Switch id="trade-all-balance" checked={tradeAllBalance} onCheckedChange={() => setTradeAllBalance(!tradeAllBalance)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Max USD per Trade */}
          <Card>
            <CardHeader>
              <CardTitle>Maximaler USD-Betrag pro Trade</CardTitle>
              <CardDescription>
                Geben Sie den maximalen USD-Betrag ein, der pro Trade verwendet werden soll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="max-usd-per-trade">Maximaler Betrag</Label>
                  <Input
                    id="max-usd-per-trade"
                    type="number"
                    value={maxUsdPerTrade}
                    onChange={(e) => setMaxUsdPerTrade(parseInt(e.target.value))}
                    placeholder="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={handleSaveSettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-6">
          Einstellungen speichern
        </Button>

        <RealTradingWarningModal
          isOpen={isRealTradingWarningOpen}
          onClose={() => setIsRealTradingWarningOpen(false)}
          onConfirm={confirmRealTrading}
        />
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer;
