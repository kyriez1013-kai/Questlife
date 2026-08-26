import { useSyncExternalStore } from 'react';

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'other';
export type InstallPromptOutcome = 'idle' | 'accepted' | 'dismissed' | 'unavailable' | 'error';

type MediaQueryLike = {
  matches: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
  addListener?: (listener: () => void) => void;
};

export type InstallShellEnvironment = {
  matchMedia?: (query: string) => MediaQueryLike;
  navigator?: {
    standalone?: boolean;
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  };
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallShellSnapshot = {
  standalone: boolean;
  installed: boolean;
  platform: InstallPlatform;
  canPrompt: boolean;
  outcome: InstallPromptOutcome;
};

const serverSnapshot: InstallShellSnapshot = {
  standalone: false,
  installed: false,
  platform: 'other',
  canPrompt: false,
  outcome: 'idle',
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let installedInSession = false;
let promptOutcome: InstallPromptOutcome = 'idle';
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function browserEnvironment(): InstallShellEnvironment {
  if (typeof window === 'undefined') return {};
  return {
    matchMedia: window.matchMedia?.bind(window),
    navigator: window.navigator as InstallShellEnvironment['navigator'],
  };
}

export function detectStandaloneMode(environment: InstallShellEnvironment): boolean {
  if (environment.navigator?.standalone === true) return true;
  return environment.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function detectInstallPlatform(environment: InstallShellEnvironment): InstallPlatform {
  const userAgent = environment.navigator?.userAgent ?? '';
  const platform = environment.navigator?.platform ?? '';
  const touchPoints = environment.navigator?.maxTouchPoints ?? 0;
  const ipadDesktopMode = platform === 'MacIntel' && touchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || ipadDesktopMode) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Macintosh|Windows|Linux/i.test(userAgent) || /Mac|Win|Linux/i.test(platform)) return 'desktop';
  return 'other';
}

function computeSnapshot(): InstallShellSnapshot {
  const environment = browserEnvironment();
  const standalone = detectStandaloneMode(environment);
  return {
    standalone,
    installed: standalone || installedInSession,
    platform: detectInstallPlatform(environment),
    canPrompt: !!deferredPrompt,
    outcome: promptOutcome,
  };
}

function publishSnapshot() {
  const next = computeSnapshot();
  if (
    next.standalone === snapshot.standalone
    && next.installed === snapshot.installed
    && next.platform === snapshot.platform
    && next.canPrompt === snapshot.canPrompt
    && next.outcome === snapshot.outcome
  ) return;
  snapshot = next;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.questlifeDisplayMode = next.standalone ? 'standalone' : 'browser';
  }
  listeners.forEach((listener) => listener());
}

function initializeInstallableShell() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const media = window.matchMedia?.('(display-mode: standalone)');
  if (media?.addEventListener) media.addEventListener('change', publishSnapshot);
  else media?.addListener?.(publishSnapshot);
  window.addEventListener('pageshow', publishSnapshot);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    promptOutcome = 'idle';
    publishSnapshot();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedInSession = true;
    promptOutcome = 'accepted';
    publishSnapshot();
  });
  snapshot = computeSnapshot();
  document.documentElement.dataset.questlifeDisplayMode = snapshot.standalone ? 'standalone' : 'browser';
}

initializeInstallableShell();

function subscribe(listener: () => void) {
  initializeInstallableShell();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  initializeInstallableShell();
  return snapshot;
}

export function useInstallableShell(): InstallShellSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export async function requestQuestLifeInstall(): Promise<InstallPromptOutcome> {
  const prompt = deferredPrompt;
  if (!prompt) {
    promptOutcome = 'unavailable';
    publishSnapshot();
    return promptOutcome;
  }
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPrompt = null;
    promptOutcome = choice.outcome;
    installedInSession = choice.outcome === 'accepted';
    publishSnapshot();
    return promptOutcome;
  } catch {
    deferredPrompt = null;
    promptOutcome = 'error';
    publishSnapshot();
    return promptOutcome;
  }
}

export function applyWebShellThemeColor(backgroundColor: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--questlife-shell-background', backgroundColor);
  document.querySelector<HTMLMetaElement>('#questlife-theme-color')?.setAttribute('content', backgroundColor);
}
