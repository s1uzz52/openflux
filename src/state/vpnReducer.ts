import {defaultConfig} from '../services/config';
import {VpnConfig, VpnState, VpnStatus} from '../types';

const disconnected: VpnStatus = {state: 'DISCONNECTED', message: 'VPN is off', uploadBytes: 0, downloadBytes: 0, uptimeSeconds: 0, connected: false};
export const initialVpnState: VpnState = {config: defaultConfig, status: disconnected};
type Action = {type: 'patchConfig'; patch: Partial<VpnConfig>} | {type: 'replaceConfig'; config: VpnConfig} | {type: 'status'; status: VpnStatus} | {type: 'starting'} | {type: 'error'; message: string};

export function vpnReducer(state: VpnState, action: Action): VpnState {
  switch (action.type) {
    case 'patchConfig': return {...state, config: {...state.config, ...action.patch}};
    case 'replaceConfig': return {...state, config: {...defaultConfig, ...action.config}};
    case 'status': return {...state, status: action.status};
    case 'starting': return {...state, status: {...state.status, state: 'STARTING', message: 'Preparing VPN interface', connected: false}};
    case 'error': return {...state, status: {...state.status, state: 'ERROR', message: action.message, connected: false}};
  }
}
