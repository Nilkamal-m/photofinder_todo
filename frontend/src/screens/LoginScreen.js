import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

import { COLORS, createStyles } from '../design/system';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!phone || !password) {
      setError('Phone and password are required');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        await register(name.trim(), phone.trim(), password, isAdmin ? 'admin' : 'user', setupKey);
      } else {
        await login(phone.trim(), password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logo}>PF</Text>
            </View>
            <Text style={styles.title}>PhotoFinder Billing</Text>
            <Text style={styles.subtitle}>Your studio, in order.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isRegister ? 'Create Account' : 'Sign in'}</Text>
            <Text style={styles.cardSub}>
              {isRegister ? 'Sign up to manage studio packages & bills' : 'Manage your studio'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isRegister && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                                    value={name}
                  onChangeText={(v) => { setName(v); setError(''); }}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
                            value={phone}
              onChangeText={(v) => { setPhone(v); setError(''); }}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
                            value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
            />

            {isRegister && (
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setIsAdmin(!isAdmin)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, isAdmin && styles.checkboxChecked]}>
                  {isAdmin && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Register as Administrator (View Profit Margins)</Text>
              </TouchableOpacity>
            )}

            {isRegister && isAdmin && (
              <>
                <Text style={styles.label}>Admin Setup Key (Default: admin123setup)</Text>
                <TextInput
                  style={styles.input}
                                    value={setupKey}
                  onChangeText={setSetupKey}
                  secureTextEntry
                />
              </>
            )}

            <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{isRegister ? 'Register Account' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              style={{ marginTop: 14 }}
            >
              <Text style={styles.link}>
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>

            {/* Public Bill Link Shortcut */}
            <TouchableOpacity
              style={styles.sharedBillLink}
              onPress={() => navigation.navigate('SharedBill')}
            >
              <Text style={styles.sharedBillText}>
                Have a shared bill token or link? View Shared Bill
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  contentWrap: { width: '100%', maxWidth: 440 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#edf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.subtext, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#dce3f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  cardSub: { fontSize: 13, color: COLORS.subtext, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  link: { color: COLORS.primary, textAlign: 'center', fontSize: 13, fontWeight: '500' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { fontSize: 12, color: COLORS.text, flex: 1 },
  sharedBillLink: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  sharedBillText: { color: COLORS.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
