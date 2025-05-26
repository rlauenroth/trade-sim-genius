
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Shield, Wifi } from 'lucide-react';

interface TimestampErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeDrift: number;
  onSyncTime?: () => void;
}

export const TimestampErrorModal = ({ 
  isOpen, 
  onClose, 
  timeDrift,
  onSyncTime 
}: TimestampErrorModalProps) => {
  const driftSeconds = Math.floor(timeDrift / 1000);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <span>Zeitstempel-Synchronisation erforderlich</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Ihre lokale Uhrzeit weicht zu stark von der KuCoin-Serverzeit ab.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-yellow-900/50 border-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              Zeitabweichung: {driftSeconds} Sekunden
              <br />
              Maximale Abweichung: 5 Sekunden
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-slate-400">
            <p className="mb-2"><strong>Lösungsschritte:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Synchronisieren Sie Ihre Systemuhr</li>
              <li>Überprüfen Sie Ihre Zeitzone</li>
              <li>Starten Sie die Anwendung neu</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          {onSyncTime && (
            <Button variant="outline" onClick={onSyncTime}>
              Zeit prüfen
            </Button>
          )}
          <Button onClick={onClose}>
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface IPWhitelistErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proxyUrl: string;
}

export const IPWhitelistErrorModal = ({ 
  isOpen, 
  onClose, 
  proxyUrl 
}: IPWhitelistErrorModalProps) => {
  const copyProxyInfo = () => {
    const info = `Proxy URL: ${proxyUrl}\nHinweis: Diese IP-Adresse muss in der KuCoin API-Whitelist stehen.`;
    navigator.clipboard.writeText(info);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-400" />
            <span>IP-Whitelist Berechtigung erforderlich</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Die Proxy-IP-Adresse ist nicht in Ihrer KuCoin API-Whitelist freigegeben.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-red-900/50 border-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              KuCoin blockiert API-Aufrufe von nicht autorisierten IP-Adressen.
            </AlertDescription>
          </Alert>
          
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-sm text-slate-400 mb-2">Proxy-URL:</div>
            <div className="flex items-center space-x-2">
              <code className="text-sm text-white flex-1 bg-slate-900 p-2 rounded">
                {proxyUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyProxyInfo}>
                Kopieren
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-slate-400">
            <p className="mb-2"><strong>So beheben Sie das Problem:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Melden Sie sich bei KuCoin an</li>
              <li>Gehen Sie zu API → API-Verwaltung</li>
              <li>Bearbeiten Sie Ihren API-Schlüssel</li>
              <li>Fügen Sie die Proxy-IP zur Whitelist hinzu</li>
            </ol>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SignatureErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload?: string;
  showDebugInfo?: boolean;
}

export const SignatureErrorModal = ({ 
  isOpen, 
  onClose, 
  payload,
  showDebugInfo = false 
}: SignatureErrorModalProps) => {
  const copyDebugInfo = () => {
    if (payload) {
      navigator.clipboard.writeText(`Signature Payload: ${payload}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Signatur-Validierung fehlgeschlagen</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Die API-Signatur konnte nicht validiert werden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-red-900/50 border-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              Überprüfen Sie Ihre API-Schlüssel und versuchen Sie es erneut.
            </AlertDescription>
          </Alert>
          
          {showDebugInfo && payload && (
            <div className="bg-slate-700 p-4 rounded">
              <div className="text-sm text-slate-400 mb-2">Debug-Informationen:</div>
              <div className="flex items-start space-x-2">
                <code className="text-xs text-white flex-1 bg-slate-900 p-2 rounded break-all">
                  {payload}
                </code>
                <Button size="sm" variant="outline" onClick={copyDebugInfo}>
                  Kopieren
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-sm text-slate-400">
            <p className="mb-2"><strong>Mögliche Ursachen:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Falscher API-Secret</li>
              <li>Ungültige Passphrase</li>
              <li>Fehlerhafte Signatur-Berechnung</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MissingHeaderErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadSession?: () => void;
}

export const MissingHeaderErrorModal = ({ 
  isOpen, 
  onClose, 
  onReloadSession 
}: MissingHeaderErrorModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-red-400" />
            <span>API-Header fehlen</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Erforderliche API-Header wurden nicht gefunden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-red-900/50 border-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              Die Session ist möglicherweise abgelaufen oder beschädigt.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-slate-400">
            <p className="mb-2"><strong>Empfohlene Maßnahmen:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Session neu laden</li>
              <li>Erneut anmelden</li>
              <li>Browser-Cache leeren</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          {onReloadSession && (
            <Button variant="outline" onClick={onReloadSession}>
              Session neu laden
            </Button>
          )}
          <Button onClick={onClose}>
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
