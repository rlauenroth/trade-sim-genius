
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { storageUtils } from '@/utils/appStorage';

export const useAppReset = () => {
  const resetApp = useCallback(() => {
    storageUtils.clearAllData();
    
    toast({
      title: "App zurückgesetzt",
      description: "Alle Daten wurden gelöscht. Sie können die App neu einrichten.",
    });
  }, []);

  return {
    resetApp
  };
};
