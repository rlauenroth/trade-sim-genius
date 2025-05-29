
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { TradeOrder } from '@/types/appState';

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trade: TradeOrder;
  estimatedValue: number;
  currentPrice: number;
}

export const TradeConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  trade,
  estimatedValue,
  currentPrice
}: TradeConfirmationModalProps) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    if (dontAskAgain) {
      localStorage.setItem('kiTradingApp_skipTradeConfirmation', 'true');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span>Trade bestätigen</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Bestätigen Sie die folgenden Trade-Details:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-slate-700 p-4 rounded space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Asset:</span>
              <Badge variant="outline" className="text-white">
                {trade.symbol}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Aktion:</span>
              <Badge 
                className={trade.side === 'buy' ? 'bg-green-600' : 'bg-red-600'}
              >
                {trade.side === 'buy' ? 'KAUFEN' : 'VERKAUFEN'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Menge:</span>
              <span className="text-white font-mono">{trade.size}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Typ:</span>
              <span className="text-white">{trade.type.toUpperCase()}</span>
            </div>
            
            {trade.price && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Limit-Preis:</span>
                <span className="text-white font-mono">${trade.price}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Aktueller Preis:</span>
              <span className="text-white font-mono">${currentPrice.toFixed(4)}</span>
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-600 pt-3">
              <span className="text-slate-400">Geschätzter Wert:</span>
              <span className="text-white font-semibold">${estimatedValue.toFixed(2)}</span>
            </div>
          </div>

          <Alert className="bg-yellow-900/50 border-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              Dieser Trade wird mit echtem Kapital ausgeführt. Stellen Sie sicher, 
              dass alle Details korrekt sind.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label htmlFor="dont-ask-again" className="text-sm text-slate-300">
              Nicht mehr nachfragen (kann in Einstellungen geändert werden)
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
            Trade ausführen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
