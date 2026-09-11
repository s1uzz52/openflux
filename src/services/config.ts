import {VpnConfig} from '../types';

export const defaultConfig: VpnConfig = {transport: 'yandex', yandexUrl: '', maxToken: '', maxUid: '', debug: false, autoReconnect: true, killSwitch: false};

export function validateConfig(config: VpnConfig): string | undefined {
  if (config.transport === 'yandex') {
    if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(config.yandexUrl.trim())) {
      return 'Enter a valid Yandex document URL.';
    }
  }
  if (config.transport === 'max') {
    if (!config.maxToken.trim()) return 'Enter the MAX token.';
    if (!/^\d+$/.test(config.maxUid.trim())) return 'Enter a valid MAX user ID.';
  }
  return undefined;
}
