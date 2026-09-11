import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from '../icons/Icon';
import {colors} from '../theme';
import {AppScreen} from '../types';

const entries: {id: AppScreen; label: string; icon: IconName}[] = [{id: 'home', label: 'Home', icon: 'home'}, {id: 'settings', label: 'Settings', icon: 'settings'}, {id: 'about', label: 'About', icon: 'info'}];
export function BottomNav({active, onChange}: {active: AppScreen; onChange: (screen: AppScreen) => void}) {
  return <View style={styles.bar}>{entries.map(item => <Pressable key={item.id} onPress={() => onChange(item.id)} style={styles.item}><Icon name={item.icon} size={20} color={active === item.id ? colors.violetSoft : colors.muted}/><Text style={[styles.label, active === item.id && styles.labelActive]}>{item.label}</Text></Pressable>)}</View>;
}
const styles = StyleSheet.create({bar: {height: 72, flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#0D0F17'}, item: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4}, label: {fontSize: 11, color: colors.muted, fontWeight: '600'}, labelActive: {color: colors.violetSoft}});
