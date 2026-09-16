import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Linking, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_VERSION_CODE = 1;

export interface RemoteUpdateData {
  latestVersion: string;
  versionCode: number;
  minVersion: string;
  releaseDate: string;
  forceUpdate: boolean;
  apkUrl: string;
  releaseNotes: {
    ar: string;
    en: string;
  };
}

export interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  hasUpdate: boolean;
  updateType: 'ota' | 'apk' | null;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: {
    ar: string;
    en: string;
  };
  forceUpdate: boolean;
  apkUrl: string;
  error: string | null;
  downloadProgress: number; // 0 to 100
}

interface UpdateContextValue extends UpdateState {
  checkForUpdates: (manual?: boolean) => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const API_UPDATE_URL = 'https://clc-crm.vercel.app/api/mobile-update';

const initialUpdateState: UpdateState = {
  isChecking: false,
  isDownloading: false,
  hasUpdate: false,
  updateType: null,
  latestVersion: CURRENT_APP_VERSION,
  currentVersion: CURRENT_APP_VERSION,
  releaseNotes: {
    ar: 'تحديثات جديدة في النظام وتحسينات في الأداء وسرعة الاستجابة.',
    en: 'New system updates, performance enhancements, and responsiveness improvements.',
  },
  forceUpdate: false,
  apkUrl: '',
  error: null,
  downloadProgress: 0,
};

const UpdateContext = createContext<UpdateContextValue>({
  ...initialUpdateState,
  checkForUpdates: async () => false,
  applyUpdate: async () => {},
  dismissUpdate: () => {},
  showModal: false,
  setShowModal: () => {},
});

/**
 * Compare two semantic version strings (e.g., '1.0.1' > '1.0.0')
 */
function isVersionNewer(remoteVersion: string, localVersion: string): boolean {
  try {
    const remoteParts = remoteVersion.split('.').map((p) => parseInt(p, 10) || 0);
    const localParts = localVersion.split('.').map((p) => parseInt(p, 10) || 0);
    const maxLen = Math.max(remoteParts.length, localParts.length);

    for (let i = 0; i < maxLen; i++) {
      const r = remoteParts[i] || 0;
      const l = localParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  } catch {
    return false;
  }
}

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpdateState>(initialUpdateState);
  const [showModal, setShowModal] = useState(false);

  // Check for updates (both OTA and server APK check)
  const checkForUpdates = useCallback(async (manual = false): Promise<boolean> => {
    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    let otaAvailable = false;
    let serverUpdateData: RemoteUpdateData | null = null;

    // 1. Check Expo OTA Updates (if running in standalone / production build)
    try {
      if (Updates.isEnabled && !__DEV__) {
        const updateCheck = await Updates.checkForUpdateAsync();
        if (updateCheck.isAvailable) {
          otaAvailable = true;
        }
      }
    } catch (e: any) {
      console.log('[Updates] OTA check skipped or error:', e?.message || e);
    }

    // 2. Check Remote Server Version API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(API_UPDATE_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        serverUpdateData = await res.json();
      }
    } catch (e: any) {
      console.log('[Updates] Server API check error:', e?.message || e);
    }

    // 3. Determine if update is available
    let hasUpdate = false;
    let updateType: 'ota' | 'apk' | null = null;
    let latestVersion = CURRENT_APP_VERSION;
    let releaseNotes = state.releaseNotes;
    let forceUpdate = false;
    let apkUrl = '';

    if (otaAvailable) {
      hasUpdate = true;
      updateType = 'ota';
      latestVersion = serverUpdateData?.latestVersion || CURRENT_APP_VERSION;
      if (serverUpdateData?.releaseNotes) {
        releaseNotes = serverUpdateData.releaseNotes;
      }
      forceUpdate = serverUpdateData?.forceUpdate || false;
      apkUrl = serverUpdateData?.apkUrl || '';
    } else if (serverUpdateData) {
      latestVersion = serverUpdateData.latestVersion;
      releaseNotes = serverUpdateData.releaseNotes || releaseNotes;
      forceUpdate = serverUpdateData.forceUpdate || false;
      apkUrl = serverUpdateData.apkUrl || '';

      const isNewer =
        serverUpdateData.versionCode > CURRENT_VERSION_CODE ||
        isVersionNewer(serverUpdateData.latestVersion, CURRENT_APP_VERSION);

      if (isNewer) {
        hasUpdate = true;
        updateType = 'apk';
      }
    }

    setState((prev) => ({
      ...prev,
      isChecking: false,
      hasUpdate,
      updateType,
      latestVersion,
      releaseNotes,
      forceUpdate,
      apkUrl,
    }));

    if (hasUpdate) {
      setShowModal(true);
      return true;
    } else if (manual) {
      return false;
    }

    return false;
  }, [state.releaseNotes]);

  // Apply update (either reload OTA or launch APK link)
  const applyUpdate = useCallback(async () => {
    if (state.updateType === 'ota') {
      try {
        setState((prev) => ({ ...prev, isDownloading: true, downloadProgress: 20, error: null }));
        
        // Progress simulation for user feedback
        const interval = setInterval(() => {
          setState((prev) => {
            if (prev.downloadProgress < 85) {
              return { ...prev, downloadProgress: prev.downloadProgress + 15 };
            }
            return prev;
          });
        }, 300);

        await Updates.fetchUpdateAsync();
        clearInterval(interval);

        setState((prev) => ({ ...prev, downloadProgress: 100 }));
        
        // Short pause to show 100% complete
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 500);
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          error: err?.message || 'فشل تحميل التحديث الهوائي، يرجى المحاولة لاحقاً',
        }));
      }
    } else if (state.apkUrl) {
      // Open APK link in browser or download manager
      try {
        await Linking.openURL(state.apkUrl);
        if (!state.forceUpdate) {
          setShowModal(false);
        }
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: 'تعذر فتح رابط التحديث، يرجى مراجعة الإدارة',
        }));
      }
    }
  }, [state.updateType, state.apkUrl, state.forceUpdate]);

  const dismissUpdate = useCallback(() => {
    if (!state.forceUpdate) {
      setShowModal(false);
    }
  }, [state.forceUpdate]);

  // Check on initial app launch
  useEffect(() => {
    // Delay check slightly so app finishes mounting
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        ...state,
        checkForUpdates,
        applyUpdate,
        dismissUpdate,
        showModal,
        setShowModal,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdateManager() {
  return useContext(UpdateContext);
}
