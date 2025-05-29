
import { STORAGE_KEY, SettingsBlock } from './types';
import { loggingService } from '@/services/loggingService';
import { toast } from '@/hooks/use-toast';
import { GetState, SetState } from './actionTypes';

export const createSaveActions = (get: GetState, set: SetState) => ({
  canSave: () => {
    const { blocks }: { blocks: Record<string, SettingsBlock> } = get();
    return Object.values(blocks).every(block => block.verified);
  },

  saveSettings: async (): Promise<boolean> => {
    const { settings, blocks, canSave } = get();
    
    if (!canSave()) {
      toast({
        title: "Validierung erforderlich",
        description: "Bitte verifizieren Sie alle Einstellungsblöcke vor dem Speichern.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      // Reset modified flags and ensure verified status is maintained
      const newBlocks = { ...blocks };
      Object.keys(newBlocks).forEach(key => {
        newBlocks[key] = {
          ...newBlocks[key],
          modified: false,
          verified: true // Ensure verified status is maintained after save
        };
      });
      set({ blocks: newBlocks });
      
      const modifiedBlocks = Object.keys(blocks).filter(key => blocks[key].modified);
      loggingService.logEvent('API', `Settings saved: ${modifiedBlocks.join(', ')}`);
      
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Änderungen wurden erfolgreich übernommen."
      });
      
      return true;
    } catch (error) {
      console.error('Error saving settings V2:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
      return false;
    }
  }
});
