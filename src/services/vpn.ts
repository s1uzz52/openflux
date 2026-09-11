import {DeviceEventEmitter, NativeModules} from 'react-native';
import {VpnConfig, VpnStatus} from '../types';

type NativeVpn = {requestPermission(): Promise<boolean>; start(configJson: string): Promise<void>; saveConfig(configJson: string): Promise<void>; stop(): Promise<void>; getStatus(): Promise<string>; getSavedConfig(): Promise<string | null>};
const nativeVpn = NativeModules.OpenFluxVpn as NativeVpn | undefined;
const offline: VpnStatus = {state: 'ERROR', message: 'OpenFlux VPN is unavailable in this build.', uploadBytes: 0, downloadBytes: 0, uptimeSeconds: 0, connected: false};

function parseStatus(value: string): VpnStatus {
  try {
    const status = JSON.parse(value) as Partial<VpnStatus>;
    const known = ['STARTING', 'CONNECTING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED', 'ERROR'];
    return {state: known.includes(status.state ?? '') ? status.state as VpnStatus['state'] : 'ERROR', message: status.message, transport: status.transport, uploadBytes: Number(status.uploadBytes) || 0, downloadBytes: Number(status.downloadBytes) || 0, uptimeSeconds: Number(status.uptimeSeconds) || 0, connected: status.connected === true};
  } catch { return offline; }
}

export const vpn = {
  requestPermission: () => nativeVpn ? nativeVpn.requestPermission() : Promise.resolve(false),
  start: (config: VpnConfig) => nativeVpn ? nativeVpn.start(JSON.stringify(config)) : Promise.reject(new Error('Native VPN unavailable')),
  saveConfig: (config: VpnConfig) => nativeVpn ? nativeVpn.saveConfig(JSON.stringify(config)) : Promise.resolve(),
  stop: () => nativeVpn ? nativeVpn.stop() : Promise.resolve(),
  async getStatus(): Promise<VpnStatus> { return nativeVpn ? parseStatus(await nativeVpn.getStatus()) : offline; },
  async getSavedConfig(): Promise<VpnConfig | null> {
    if (!nativeVpn) return null;
    const raw = await nativeVpn.getSavedConfig();
    if (!raw) return null;
    try { return JSON.parse(raw) as VpnConfig; } catch { return null; }
  },
  subscribe(listener: (status: VpnStatus) => void) { return DeviceEventEmitter.addListener('OpenFluxVpnStatus', (raw: string) => listener(parseStatus(raw))); },
};
