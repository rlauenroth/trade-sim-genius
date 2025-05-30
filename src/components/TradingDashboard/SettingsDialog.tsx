
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useSettingsV2Store } from '@/stores/settingsV2';
import { toast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  onRefresh?: () => void;
}

export const SettingsDialog = ({ onRefresh }: SettingsDialogProps) => {
  const { settings, updateKuCoinSettings, updateOpenRouterSettings } = useSettingsV2Store();
  const [isOpen, setIsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    kucoinKey: settings.kucoin.key || '',
    kucoinSecret: settings.kucoin.secret || '',
    kucoinPassphrase: settings.kucoin.passphrase || '',
    openRouterKey: settings.openRouter.apiKey || '',
  });

  const handleSave = () => {
    updateKuCoinSettings({
      key: tempSettings.kucoinKey,
      secret: tempSettings.kucoinSecret,
      passphrase: tempSettings.kucoinPassphrase,
      verified: false
    });

    updateOpenRouterSettings({
      apiKey: tempSettings.openRouterKey,
      verified: false
    });

    toast({
      title: "Einstellungen gespeichert",
      description: "API-Schlüssel wurden aktualisiert",
    });

    setIsOpen(false);
    onRefresh?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-white border-slate-600 hover:bg-slate-700"
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Trading-Einstellungen</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="kucoin-key" className="text-slate-300">
              KuCoin API Key
            </Label>
            <Input
              id="kucoin-key"
              type="password"
              value={tempSettings.kucoinKey}
              onChange={(e) => setTempSettings({ ...tempSettings, kucoinKey: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kucoin-secret" className="text-slate-300">
              KuCoin API Secret
            </Label>
            <Input
              id="kucoin-secret"
              type="password"
              value={tempSettings.kucoinSecret}
              onChange={(e) => setTempSettings({ ...tempSettings, kucoinSecret: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kucoin-passphrase" className="text-slate-300">
              KuCoin API Passphrase
            </Label>
            <Input
              id="kucoin-passphrase"
              type="password"
              value={tempSettings.kucoinPassphrase}
              onChange={(e) => setTempSettings({ ...tempSettings, kucoinPassphrase: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openrouter-key" className="text-slate-300">
              OpenRouter API Key
            </Label>
            <Input
              id="openrouter-key"
              type="password"
              value={tempSettings.openRouterKey}
              onChange={(e) => setTempSettings({ ...tempSettings, openRouterKey: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-slate-600 text-slate-300"
          >
            Abbrechen
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
