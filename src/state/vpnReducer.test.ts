import {initialVpnState, vpnReducer} from './vpnReducer';

describe('vpnReducer', () => {
  it('keeps transport configuration in one state object', () => {
    const next = vpnReducer(initialVpnState, {type: 'patchConfig', patch: {transport: 'max', maxUid: '42'}});
    expect(next.config.transport).toBe('max');
    expect(next.config.maxUid).toBe('42');
  });
  it('does not claim connected before the native service reports it', () => {
    const next = vpnReducer(initialVpnState, {type: 'starting'});
    expect(next.status.state).toBe('STARTING');
    expect(next.status.connected).toBe(false);
  });
});
