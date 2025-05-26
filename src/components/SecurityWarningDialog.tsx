
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface SecurityWarningDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  acknowledged: boolean;
  onAcknowledgedChange: (checked: boolean) => void;
}

const SecurityWarningDialog: React.FC<SecurityWarningDialogProps> = ({
  isOpen,
  onAccept,
  onReject,
  acknowledged,
  onAcknowledgedChange
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-600/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-red-400 text-xl">
                ACHTUNG: Hohes Sicherheitsrisiko!
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-slate-300 space-y-4">
          <p className="text-base leading-relaxed">
            Ihre API-Schlüssel werden für diese Test-App <strong>unverschlüsselt</strong> im 
            lokalen Speicher Ihres Browsers abgelegt. Dies ist mit erheblichen Sicherheitsrisiken verbunden.
          </p>
          
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-2">Sicherheitsrisiken:</h4>
            <ul className="text-red-200 text-sm space-y-1">
              <li>• Diebstahl durch Cross-Site-Scripting (XSS)</li>
              <li>• Zugriff durch bösartige Browser-Erweiterungen</li>
              <li>• Physischer Zugriff oder Malware auf Ihrem Computer</li>
              <li>• Möglicher unbefugter Zugriff auf Ihr KuCoin-Konto</li>
            </ul>
          </div>
          
          <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4">
            <h4 className="font-semibold text-amber-400 mb-2">Empfohlene Sicherheitsmaßnahmen:</h4>
            <ul className="text-amber-200 text-sm space-y-1">
              <li>• Verwenden Sie diese App nur auf privaten, gesicherten Computern</li>
              <li>• Nutzen Sie Browser mit aktuellen Sicherheitsupdates</li>
              <li>• Erstellen Sie dedizierte API-Schlüssel mit minimalen Berechtigungen</li>
              <li>• Löschen Sie die API-Schlüssel nach dem Testen aus der App</li>
            </ul>
          </div>
          
          <p className="text-red-300 font-medium">
            Verwenden Sie diese Test-App nur in einer sicheren Umgebung und niemals mit 
            API-Schlüsseln, die Zugriff auf erhebliche Vermögenswerte gewähren.
          </p>
          
          <p className="text-slate-400 text-sm">
            <strong>Sie nutzen diese Funktion auf Ihr alleiniges Risiko.</strong>
          </p>
        </DialogDescription>
        
        <DialogFooter className="flex-col space-y-4">
          <div className="flex items-center space-x-2 w-full">
            <Checkbox 
              id="risk-acknowledgment" 
              checked={acknowledged}
              onCheckedChange={onAcknowledgedChange}
            />
            <label 
              htmlFor="risk-acknowledgment" 
              className="text-sm text-slate-300 leading-tight cursor-pointer"
            >
              Ich habe die Risiken verstanden und akzeptiere sie für diese Test-App.
            </label>
          </div>
          
          <div className="flex space-x-3 w-full">
            <Button 
              variant="outline" 
              onClick={onReject}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={onAccept}
              disabled={!acknowledged}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Risiko akzeptieren und fortfahren
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityWarningDialog;
