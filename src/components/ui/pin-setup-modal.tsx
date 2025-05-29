
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield } from 'lucide-react';
import { pinService } from '@/services/pinService';
import { toast } from '@/hooks/use-toast';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PinSetupModal = ({ isOpen, onClose, onSuccess }: PinSetupModalProps) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupPin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "Ungültige PIN",
        description: "Die PIN muss 4-6 Ziffern lang sein.",
        variant: "destructive"
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "PIN stimmt nicht überein",
        description: "Bitte stellen Sie sicher, dass beide PINs identisch sind.",
        variant: "destructive"
      });
      return;
    }

    if (!/^\d+$/.test(pin)) {
      toast({
        title: "Ungültige PIN",
        description: "Die PIN darf nur Ziffern enthalten.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await pinService.setupPin(pin);
      if (success) {
        toast({
          title: "PIN eingerichtet",
          description: "Ihre Sicherheits-PIN wurde erfolgreich eingerichtet."
        });
        setPin('');
        setConfirmPin('');
        onSuccess();
      } else {
        throw new Error('PIN setup failed');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "PIN konnte nicht eingerichtet werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPin('');
    setConfirmPin('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-blue-400" />
            Sicherheits-PIN einrichten
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Richten Sie eine PIN für den Real-Trading-Modus ein. Diese PIN wird bei jedem Start der App im Real-Trading-Modus abgefragt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium mb-1">Wichtige Sicherheitshinweise:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Wählen Sie eine PIN, die Sie sich merken können</li>
                  <li>Bei Verlust der PIN müssen alle API-Keys neu eingegeben werden</li>
                  <li>Nach 3 Fehlversuchen wird der Account 30 Minuten gesperrt</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="pin" className="text-slate-300">
                PIN (4-6 Ziffern)
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                className="bg-slate-700 border-slate-600 text-white text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirm-pin" className="text-slate-300">
                PIN bestätigen
              </Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                className="bg-slate-700 border-slate-600 text-white text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
              disabled={isLoading}
            >
              Zurücksetzen
            </Button>
            <Button
              onClick={handleSetupPin}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || pin.length < 4 || pin !== confirmPin}
            >
              {isLoading ? 'Einrichten...' : 'PIN einrichten'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
