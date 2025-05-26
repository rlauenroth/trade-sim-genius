
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, TrendingUp, Bot, AlertCircle, Loader2 } from 'lucide-react';
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
    isLoading,
    checkSetupStatus,
    loadUserSettings 
  } = useAppState();

  useEffect(() => {
    console.log('Index component mounted, checking setup status...');
    checkSetupStatus();
  }, [checkSetupStatus]);

  useEffect(() => {
    console.log('=== INDEX STATE CHANGE ===', { 
      isSetupComplete, 
      isUnlocked, 
      isLoading 
    });
  }, [isSetupComplete, isUnlocked, isLoading]);

  // Show loading spinner while loading
  if (isLoading) {
    console.log('Showing loading screen...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md bg-slate-800 border-slate-700">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
                  <div className="text-white font-medium">
                    App wird entsperrt...
                  </div>
                  <div className="text-slate-400 text-sm">
                    Bitte warten Sie einen Moment.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show setup wizard if first time user
  if (!isSetupComplete) {
    console.log('Showing setup wizard');
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
    console.log('Showing unlock screen');
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
  console.log('Showing trading dashboard');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <TradingDashboard />
    </div>
  );
};

export default Index;
