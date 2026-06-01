import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AIModelConfig {
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
}

export interface AISettings {
  flash: AIModelConfig;
  pro: AIModelConfig;
  maxHistory: number;
}

const STORAGE_KEY = '@rhodes_settings_v2';

const DEFAULT_FLASH: AIModelConfig = {
  model: 'deepseek-v4-flash',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.8,
};

const DEFAULT_PRO: AIModelConfig = {
  model: 'deepseek-v4-pro',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.7,
};

const DEFAULT_SETTINGS: AISettings = {
  flash: DEFAULT_FLASH,
  pro: DEFAULT_PRO,
  maxHistory: 20,
};

interface SettingsState extends AISettings {
  loaded: boolean;
  setFlashConfig: (config: Partial<AIModelConfig>) => void;
  setProConfig: (config: Partial<AIModelConfig>) => void;
  setMaxHistory: (max: number) => void;
  resetSettings: () => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  setFlashConfig: (config) => {
    set((state) => ({ flash: { ...state.flash, ...config } }));
    get().saveSettings();
  },

  setProConfig: (config) => {
    set((state) => ({ pro: { ...state.pro, ...config } }));
    get().saveSettings();
  },

  setMaxHistory: (maxHistory: number) => {
    set({ maxHistory });
    get().saveSettings();
  },

  resetSettings: () => {
    set({
      flash: { ...DEFAULT_FLASH },
      pro: { ...DEFAULT_PRO },
      maxHistory: 20,
    });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ ...DEFAULT_SETTINGS, ...parsed, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveSettings: async () => {
    const { flash, pro, maxHistory } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ flash, pro, maxHistory })
      );
    } catch {
      // ignore
    }
  },
}));
