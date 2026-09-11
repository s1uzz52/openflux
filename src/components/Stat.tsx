import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from '../icons/Icon';
import {colors} from '../theme';

export function Stat({icon, label, value, color = colors.text}: {icon: IconName; label: string; value: string; color?: string}) {
  return <View style={styles.item}><View style={styles.icon}><Icon name={icon} size={18} color={color}/></View><View><Text style={styles.label}>{label}</Text><Text style={[styles.value, {color}]}>{value}</Text></View></View>;
}
const styles = StyleSheet.create({item: {flexDirection: 'row', alignItems: 'center', gap: 10}, icon: {width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center'}, label: {fontSize: 11, color: colors.muted, marginBottom: 2}, value: {fontSize: 14, fontWeight: '700'}});
