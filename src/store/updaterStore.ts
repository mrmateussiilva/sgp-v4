import { create } from 'zustand';

interface UpdaterState {
    isUpdateAvailable: boolean;
    updateVersion: string | null;
    setUpdateAvailable: (available: boolean, version?: string) => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
    isUpdateAvailable: false,
    updateVersion: null,
    setUpdateAvailable: (available, version) => set({
        isUpdateAvailable: available,
        updateVersion: version || null
    }),
}));
