import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {Icon} from '../icons/Icon';
import {colors} from '../theme';
import {ConnectionState} from '../types';

const label: Record<ConnectionState, string> = {STARTING: 'STARTING', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', DISCONNECTING: 'DISCONNECTING', DISCONNECTED: 'DISCONNECTED', ERROR: 'ATTENTION'};
export function ConnectionOrb({state}: {state: ConnectionState}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const alive = state === 'CONNECTED' || state === 'CONNECTING' || state === 'STARTING';
  useEffect(() => {
    if (!alive) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, {toValue: 1, duration: 1200, useNativeDriver: true}), Animated.timing(pulse, {toValue: 0, duration: 1200, useNativeDriver: true})]));
    loop.start(); return () => loop.stop();
  }, [alive, pulse]);
  const accent = state === 'CONNECTED' ? colors.green : state === 'ERROR' ? colors.red : state === 'DISCONNECTED' ? colors.muted : colors.violet;
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.pulse, {
        borderColor: accent,
        opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.12, 0.42]}),
        transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [0.92, 1.06]})}],
      }]} />
      <View style={[styles.orb, {borderColor: `${accent}70`}]}> 
        <Icon name={state === 'ERROR' ? 'warning' : state === 'CONNECTED' ? 'check' : 'shield'} size={36} color={accent}/>
      </View>
      <Text style={[styles.status, {color: accent}]}>{label[state]}</Text>
    </View>
  );
}
const styles = StyleSheet.create({wrap: {height: 190, alignItems: 'center', justifyContent: 'center'}, pulse: {position: 'absolute', width: 158, height: 158, borderRadius: 79, borderWidth: 1}, orb: {width: 116, height: 116, borderRadius: 58, borderWidth: 1, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', shadowColor: colors.violet, shadowOpacity: .3, shadowRadius: 24, elevation: 8}, status: {marginTop: 14, fontWeight: '800', fontSize: 12, letterSpacing: 1.8}});
