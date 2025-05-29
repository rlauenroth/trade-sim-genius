
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Clock } from 'lucide-react';
import { pinService } from '@/services/pinService';
import { toast } from '@/hooks/use-toast';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onForgotPin: () => void;
}

export const PinVerificationModal = ({ isOpen, onClose, onSuccess, onForgotPin }: PinVerificationModalProps) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setAttemptsLeft(null);
      
      // Check if account is locked
      const timeRemaining = pinService.getLockoutTimeRemaining();
      if (timeRemaining > 0) {
        setLockoutTime(timeRemaining);
        
        const interval = setInterval(() => {
          const remaining = pinService.getLockoutTimeRemaining();
          if (remaining <= 0) {
            setLockoutTime(0);
            clearInterval(interval);
          } else {
            setLockoutTime(remaining);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [isOpen]);

  const handleVerifyPin = async () => {
    if (pin.length < 4) {
      toast({
        title: "Ungültige PIN",
        description: "Bitte geben Sie Ihre komplette PIN ein.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await pinService.verifyPin(pin);
      
      if (result.success) {
        toast({
          title: "PIN verifiziert",
          description: "Real-Trading-Modus ist jetzt verfügbar."
        });
        setPin('');
        onSuccess();
      } else {
        if (result.lockedUntil) {
          setLockoutTime(result.lockedUntil - Date.now());
          toast({
            title: "Account gesperrt",
            description: "Zu viele Fehlversuche. Account ist für 30 Minuten gesperrt.",
            variant: "destructive"
          });
        } else {
          setAttemptsLeft(result.attemptsLeft ?? null);
          toast({
            title: "Falsche PIN",
            description: `Noch ${result.attemptsLeft ?? 0} Versuche übrig.`,
            variant: "destructive"
          });
        }
        setPin('');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "PIN-Verifizierung fehlgeschlagen.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockoutTime = (ms: number): string => {
    const minutes = Math.ceil(ms / (1000 * 60));
    return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  };

  const isLocked = lockoutTime > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-blue-400" />
            Real-Trading PIN eingeben
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Geben Sie Ihre Sicherheits-PIN ein, um den Real-Trading-Modus zu aktivieren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLocked && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="text-sm text-red-300">
                  <p className="font-medium">Account gesperrt</p>
                  <p className="text-xs mt-1">
                    Noch {formatLockoutTime(lockoutTime)} bis zur Entsperrung
                  </p>
                </div>
              </div>
            </div>
          )}

          {attemptsLeft !== null && attemptsLeft > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <p>Noch {attemptsLeft} Versuch{attemptsLeft !== 1 ? 'e' : ''} übrig</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="pin-verify" className="text-slate-300">
              PIN eingeben
            </Label>
            <Input
              id="pin-verify"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className="bg-slate-700 border-slate-600 text-white text-center text-lg tracking-widest"
              maxLength={6}
              disabled={isLocked}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLocked && pin.length >= 4) {
                  handleVerifyPin();
                }
              }}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              onClick={onForgotPin}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
              disabled={isLoading}
            >
              PIN vergessen?
            </Button>
            <Button
              onClick={handleVerifyPin}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || pin.length < 4 || isLocked}
            >
              {isLoading ? 'Prüfen...' : 'Verifizieren'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
