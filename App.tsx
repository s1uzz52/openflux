import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar, StyleSheet, View} from 'react-native';
import {AboutScreen} from './src/screens/AboutScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {BottomNav} from './src/components/BottomNav';
import {defaultConfig, validateConfig} from './src/services/config';
import {vpn} from './src/services/vpn';
import {initialVpnState, vpnReducer} from './src/state/vpnReducer';
import {AppScreen, VpnConfig} from './src/types';
import {colors} from './src/theme';

function App() {
  const [state, dispatch] = useReducer(vpnReducer, initialVpnState);
  const [screen, setScreen] = useState<AppScreen>('home');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [status, config] = await Promise.all([vpn.getStatus(), vpn.getSavedConfig()]);
      if (!mounted) return;
      dispatch({type: 'status', status});
      if (config) dispatch({type: 'replaceConfig', config});
    };
    void load();
    const subscription = vpn.subscribe(status => dispatch({type: 'status', status}));
    const poll = setInterval(() => void vpn.getStatus().then(status => dispatch({type: 'status', status})), 1500);
    return () => {
      mounted = false;
      subscription.remove();
      clearInterval(poll);
    };
  }, []);

  const updateConfig = useCallback((patch: Partial<VpnConfig>) => {
    const config = {...state.config, ...patch};
    dispatch({type: 'patchConfig', patch});
    // The native layer keeps the complete configuration in encrypted Android
    // storage, so a process/activity restart cannot discard edited secrets.
    void vpn.saveConfig(config).catch(() => {
      dispatch({type: 'error', message: 'OpenFlux could not safely save this configuration.'});
    });
  }, [state.config]);

  const connect = useCallback(async () => {
    const error = validateConfig(state.config);
    if (error) {
      dispatch({type: 'error', message: error});
      setScreen('settings');
      return;
    }
    try {
      const approved = await vpn.requestPermission();
      if (!approved) {
        dispatch({type: 'error', message: 'VPN permission was not granted.'});
        return;
      }
      dispatch({type: 'starting'});
      await vpn.start(state.config);
    } catch {
      dispatch({type: 'error', message: 'OpenFlux could not start. Check Android VPN permission and configuration.'});
    }
  }, [state.config]);

  const disconnect = useCallback(async () => {
    try {
      await vpn.stop();
    } catch {
      dispatch({type: 'error', message: 'OpenFlux could not stop cleanly.'});
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.app}>
        {screen === 'home' && <HomeScreen state={state} onConnect={connect} onDisconnect={disconnect} onSettings={() => setScreen('settings')} />}
        {screen === 'settings' && <SettingsScreen config={state.config ?? defaultConfig} onChange={updateConfig} />}
        {screen === 'about' && <AboutScreen />}
        <BottomNav active={screen} onChange={setScreen} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({app: {flex: 1, backgroundColor: colors.background}});

export default App;
