
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  retryAfter: number; // seconds
}

export const RateLimitModal = ({ isOpen, onClose, retryAfter }: RateLimitModalProps) => {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(retryAfter);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, retryAfter, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span>Rate Limit erreicht</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Die KuCoin API hat ein Rate Limit erreicht. Bitte warten Sie, bis die Beschränkung aufgehoben wird.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <Clock className="h-12 w-12 text-blue-400 mx-auto" />
            <div className="text-2xl font-mono text-white">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-slate-400">
              Nächster Versuch automatisch in...
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ProxyErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proxyUrl: string;
}

export const ProxyErrorModal = ({ isOpen, onClose, proxyUrl }: ProxyErrorModalProps) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(proxyUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Proxy offline</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Der KuCoin-Proxy ist nicht erreichbar. Überprüfen Sie Ihre Netzwerkverbindung und die Proxy-Konfiguration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-sm text-slate-400 mb-2">Proxy-URL:</div>
            <div className="flex items-center space-x-2">
              <code className="text-sm text-white flex-1 bg-slate-900 p-2 rounded">
                {proxyUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyToClipboard}>
                Kopieren
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-slate-400">
            Weitere Informationen zur Proxy-Installation finden Sie in der Dokumentation.
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
