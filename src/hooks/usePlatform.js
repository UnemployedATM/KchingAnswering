import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  return {
    isIOS:     platform === 'ios',
    isAndroid: platform === 'android',
    isMobile:  platform === 'ios' || platform === 'android',
  };
}
