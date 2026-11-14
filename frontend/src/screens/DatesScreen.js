import React, { useCallback, useEffect, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { notify } from '../utils/dialog';

import { COLORS, createStyles } from '../design/system';

const TYPES = [
  { value: 'blocked', label: 'Blocked' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'tentative', label: 'Tentative' },
];

export default function DatesScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('blocked');
  const [checkResult, setCheckResult] = useState(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/dates');
      setEntries(data);
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Failed to load important dates');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {loadEntries();},[loadEntries]));

  const validateDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) {
      notify('Invalid date', 'Enter a valid date in YYYY-MM-DD format.');
      return false;
    }
    return true;
  };

  const checkDate = async () => {
    if (!validateDate()) return;
    setChecking(true);
    try {
      const { data } = await api.get('/dates/check', { params: { date } });
      setCheckResult(data);
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Could not check date availability');
    } finally {
      setChecking(false);
    }
  };

  const blockDate = async () => {
    if (!validateDate()) return;
    if (!title.trim()) {
      notify('Reason required', 'Add a short reason for blocking this date.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/dates', { date, title, type, notes });
      setTitle('');
      setNotes('');
      setCheckResult(null);
      await loadEntries();
      notify('Date saved', `${date} is now marked as ${type}.`);
    } catch (err) {
      notify('Could not save date', err.response?.data?.message || 'Please try another date.');
    } finally {
      setSaving(false);
    }
  };

  const unblockDate = async (entry) => {
    try {
      await api.delete(`/dates/${entry._id}`);
      loadEntries();
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Could not unblock date');
    }
  };

  const renderEntry = ({ item }) => {
    const isClientBooking = item.isClientAutoBooking;
    return (
      <View style={styles.entryCard}>
        <View style={styles.entryDate}>
          <Text style={styles.entryDateText}>{item.dateString}</Text>
          <Text style={[styles.entryType, item.type === 'booked' ? styles.booked : styles.blocked]}>
            {item.type?.toUpperCase()}
          </Text>
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryTitle}>{item.title}</Text>
          {item.notes ? <Text style={styles.entryNotes}>{item.notes}</Text> : null}
        </View>
        {isClientBooking ? (
          <Text style={styles.autoBooking}>Client booking</Text>
        ) : (
          <TouchableOpacity accessibilityRole="button" onPress={() => unblockDate(item)} style={styles.unblockButton}>
            <Text style={styles.unblockText}>Unblock</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} accessibilityLabel="Back" style={styles.backButton}>
          <Feather accessible={false} name="arrow-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text style={styles.heading}>Important Dates</Text>
          <Text style={styles.subheading}>Check availability and protect booked dates</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Check a date</Text>
          <Text style={styles.helper}>Enter a date to see whether it is free, booked, or blocked.</Text>
          <View style={styles.inlineRow}>
            <TextInput accessibilityLabel="Enter a date to see whether it is free, booked, or blocked."
              style={[styles.input, styles.dateInput]}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={value => {setDate(value);setCheckResult(null);}}
              autoCapitalize="none"
            />
            <TouchableOpacity accessibilityRole="button" style={styles.primaryButton} onPress={checkDate} disabled={checking}>
              {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Check</Text>}
            </TouchableOpacity>
          </View>

          {checkResult ? (
            <View style={[styles.resultBox, checkResult.isBlocked ? styles.resultBusy : styles.resultFree]}>
              <Text style={styles.resultTitle}>
                {checkResult.isBlocked ? 'Date is not available' : 'Date is available'}
              </Text>
              <Text style={styles.resultText}>{checkResult.message}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Mark an important date</Text>
          <TextInput accessibilityLabel="Mark an important date"
            style={styles.input}
            placeholder="Reason or event name"
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.typeRow}>
            {TYPES.map((option) => (
              <TouchableOpacity accessibilityRole="button"
                key={option.value}
                style={[styles.typeButton, type === option.value && styles.typeButtonActive]}
                onPress={() => setType(option.value)}
              >
                <Text style={[styles.typeText, type === option.value && styles.typeTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <TouchableOpacity accessibilityRole="button" style={styles.saveButton} onPress={blockDate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save date</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Upcoming dates</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item._id}
            renderItem={renderEntry}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No blocked or booked dates yet.</Text>}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  backButton: { paddingVertical: 8, paddingRight: 16 },
  backText: { color: COLORS.primary, fontWeight: '700' },
  topBarTitle: { flex: 1 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  subheading: { color: COLORS.subtext, fontSize: 12, marginTop: 3 },
  content: { padding: 20, maxWidth: 900, width: '100%', alignSelf: 'center' },
  formCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 18, marginBottom: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 7 },
  helper: { color: COLORS.subtext, fontSize: 13, marginBottom: 14 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, marginBottom: 12 },
  dateInput: { flex: 1, marginBottom: 0 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 11, minWidth: 86, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  resultBox: { borderRadius: 8, padding: 12, marginTop: 14 },
  resultFree: { backgroundColor: '#e8f5e9' },
  resultBusy: { backgroundColor: '#fff3e0' },
  resultTitle: { color: COLORS.text, fontWeight: '700' },
  resultText: { color: COLORS.subtext, marginTop: 4, fontSize: 13 },
  divider: { height: 1, backgroundColor: '#eeeeee', marginVertical: 20 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  typeButtonActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  typeText: { color: COLORS.subtext, fontSize: 13 },
  typeTextActive: { color: COLORS.primary, fontWeight: '700' },
  notesInput: { minHeight: 64, textAlignVertical: 'top' },
  saveButton: { backgroundColor: COLORS.success, borderRadius: 8, padding: 12, alignItems: 'center' },
  entryCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryDate: { minWidth: 92 },
  entryDateText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  entryType: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  booked: { color: COLORS.error },
  blocked: { color: COLORS.warning },
  entryInfo: { flex: 1 },
  entryTitle: { color: COLORS.text, fontWeight: '600' },
  entryNotes: { color: COLORS.subtext, fontSize: 12, marginTop: 3 },
  autoBooking: { color: COLORS.subtext, fontSize: 11 },
  unblockButton: { borderWidth: 1, borderColor: '#ffcdd2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  unblockText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  loader: { marginTop: 18 },
  emptyText: { color: COLORS.subtext, textAlign: 'center', padding: 20 },
});
