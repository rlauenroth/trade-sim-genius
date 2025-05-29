
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, DollarSign } from 'lucide-react';

interface RealTradingWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RealTradingWarningModal = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}: RealTradingWarningModalProps) => {
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

  const handleConfirm = () => {
    if (hasReadWarning && acknowledgeRisk) {
      onConfirm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-red-600 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center space-x-2 text-xl">
            <AlertTriangle className="h-6 w-6" />
            <span>WARNUNG: Echter Handel aktivieren</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Sie sind dabei, den Real-Trading-Modus zu aktivieren. Bitte lesen Sie die folgenden Warnungen sorgfältig.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-red-900/50 border-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              <strong>RISIKO:</strong> Im Real-Trading-Modus werden alle Trades mit echtem Kapital ausgeführt. 
              Sie können echtes Geld verlieren!
            </AlertDescription>
          </Alert>

          <div className="bg-slate-700 p-4 rounded space-y-3">
            <h4 className="text-white font-semibold flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Wichtige Sicherheitshinweise:</span>
            </h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• <strong>Kapitalrisiko:</strong> Trading birgt erhebliche Verlustrisiken</li>
              <li>• <strong>Marktvolatilität:</strong> Krypto-Märkte sind hochvolatil und unvorhersagbar</li>
              <li>• <strong>KI-Limitationen:</strong> KI-Signale sind keine Garantie für Gewinne</li>
              <li>• <strong>Technische Risiken:</strong> API-Ausfälle oder Netzwerkprobleme können auftreten</li>
              <li>• <strong>Regulatorische Risiken:</strong> Rechtliche Änderungen können Trading beeinträchtigen</li>
            </ul>
          </div>

          <div className="bg-slate-700 p-4 rounded space-y-3">
            <h4 className="text-white font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Empfohlene Vorsichtsmaßnahmen:</span>
            </h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• Investieren Sie nur Geld, das Sie sich leisten können zu verlieren</li>
              <li>• Setzen Sie strenge Risiko-Limits</li>
              <li>• Überwachen Sie Ihre Trades regelmäßig</li>
              <li>• Beginnen Sie mit kleinen Beträgen</li>
              <li>• Verwenden Sie Stop-Loss-Orders</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="read-warning"
                checked={hasReadWarning}
                onCheckedChange={(checked) => setHasReadWarning(checked === true)}
              />
              <label htmlFor="read-warning" className="text-sm text-slate-300">
                Ich habe alle Warnungen und Risiken gelesen und verstanden
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="acknowledge-risk"
                checked={acknowledgeRisk}
                onCheckedChange={(checked) => setAcknowledgeRisk(checked === true)}
              />
              <label htmlFor="acknowledge-risk" className="text-sm text-slate-300">
                Ich bestätige, dass ich die Risiken verstehe und auf eigene Verantwortung handle
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!hasReadWarning || !acknowledgeRisk}
            className="bg-red-600 hover:bg-red-700"
          >
            Real-Trading aktivieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
