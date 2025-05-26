
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, TrendingUp, Bot, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SetupWizard from '@/components/SetupWizard';
import UnlockScreen from '@/components/UnlockScreen';
import TradingDashboard from '@/components/TradingDashboard';
import { useAppState } from '@/hooks/useAppState';

const Index = () => {
  const { 
    isSetupComplete, 
    isUnlocked, 
    currentStep,
    checkSetupStatus,
    loadUserSettings 
  } = useAppState();

  useEffect(() => {
    checkSetupStatus();
    if (isSetupComplete && isUnlocked) {
      loadUserSettings();
    }
  }, [isSetupComplete, isUnlocked]);

  // Show setup wizard if first time user
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">KI Trading Assistant</h1>
                <p className="text-slate-400">Intelligente Krypto-Trading Signale</p>
              </div>
            </div>
          </div>
          <SetupWizard />
        </div>
      </div>
    );
  }

  // Show unlock screen if app is locked
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">KI Trading Assistant</h1>
                <p className="text-slate-400">App entsperren</p>
              </div>
            </div>
          </div>
          <UnlockScreen />
        </div>
      </div>
    );
  }

  // Show main trading dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <TradingDashboard />
    </div>
  );
};

export default Index;
