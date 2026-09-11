export type TransportKind = 'yandex' | 'max';
export type ConnectionState = 'STARTING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'DISCONNECTED' | 'ERROR';
export type AppScreen = 'home' | 'settings' | 'about';

export interface VpnConfig {
  transport: TransportKind;
  yandexUrl: string;
  maxToken: string;
  maxUid: string;
  debug: boolean;
  autoReconnect: boolean;
  killSwitch: boolean;
}

export interface VpnStatus {
  state: ConnectionState;
  message?: string;
  transport?: string;
  uploadBytes: number;
  downloadBytes: number;
  uptimeSeconds: number;
  connected: boolean;
}

export interface VpnState {
  config: VpnConfig;
  status: VpnStatus;
}
