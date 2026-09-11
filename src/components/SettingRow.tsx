import React from 'react';
import {StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {colors} from '../theme';

export function SettingInput({label, hint, value, onChangeText, secure = false, keyboardType = 'default'}: {label: string; hint?: string; value: string; onChangeText: (value: string) => void; secure?: boolean; keyboardType?: 'default' | 'numeric' | 'url'}) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text>{hint && <Text style={styles.hint}>{hint}</Text>}<TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} keyboardType={keyboardType} placeholderTextColor="#525A70" style={styles.input}/></View>;
}
export function SettingSwitch({label, detail, value, onChange}: {label: string; detail: string; value: boolean; onChange: (value: boolean) => void}) {
  return <View style={styles.switchRow}><View style={styles.copy}><Text style={styles.label}>{label}</Text><Text style={styles.hint}>{detail}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{false: colors.border, true: '#6544BA'}} thumbColor={value ? colors.violetSoft : '#C9CEDC'}/></View>;
}
const styles = StyleSheet.create({row: {marginBottom: 18}, label: {color: colors.text, fontSize: 14, fontWeight: '700'}, hint: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4}, input: {height: 48, paddingHorizontal: 14, marginTop: 10, borderRadius: 14, color: colors.text, backgroundColor: '#0D0F17', borderWidth: 1, borderColor: colors.border, fontSize: 14}, switchRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderColor: colors.border}, copy: {flex: 1, paddingRight: 16}});
