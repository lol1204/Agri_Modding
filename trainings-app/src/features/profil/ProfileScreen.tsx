import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChipGroup } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListRow, SectionTitle } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { ConfirmSheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { updateProfile } from '@/db/actions/profile';
import { authErrorMessage, deleteAccount, signOutUser } from '@/db/auth';
import { useSession } from '@/db/session';
import { dataStore, useData } from '@/db/store';
import { goalLabels, levelLabels } from '@/domain/labels';
import type { Goal, Level, WeightUnit } from '@/domain/types';
import { spacing } from '@/theme';

const goalOptions = (Object.keys(goalLabels) as Goal[]).map((value) => ({ value, label: goalLabels[value] }));
const levelOptions = (Object.keys(levelLabels) as Level[]).map((value) => ({ value, label: levelLabels[value] }));
const unitOptions: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogramm (kg)' },
  { value: 'lb', label: 'Pfund (lb)' },
];
const durationOptions = [30, 45, 60, 75, 90].map((value) => ({ value, label: `${value} Min.` }));

export function ProfileScreen() {
  const { profile } = useData();
  const session = useSession();
  const { showToast } = useToast();
  const isLocal = session.status === 'ready' && session.mode === 'local';
  const email = session.status === 'ready' ? session.user?.email : null;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runDelete = async () => {
    setBusy(true);
    setDeleteError(null);
    try {
      const repos = dataStore.repos;
      if (isLocal) {
        await repos.deleteAllData();
      } else {
        await deleteAccount(password, () => repos.deleteAllData());
      }
      setConfirmDelete(false);
      setPassword('');
      showToast({ message: isLocal ? 'Alle Daten auf diesem Gerät wurden gelöscht.' : 'Dein Konto wurde gelöscht.' });
    } catch (e) {
      setDeleteError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Profil" inTabs testID="screen-profil">
      <Card style={styles.account}>
        <View style={styles.accountIcon}>
          <Icon name={isLocal ? 'cloudOff' : 'profile'} size={24} color="accent" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{isLocal ? 'Lokaler Modus' : (email ?? 'Angemeldet')}</AppText>
          <AppText variant="small" color="textMuted">
            {isLocal
              ? 'Daten nur auf diesem Gerät. Mit Firebase-Konto werden sie zusätzlich in der Cloud gesichert.'
              : 'Daten werden in deinem Konto gesichert und offline zwischengespeichert.'}
          </AppText>
        </View>
      </Card>

      <SectionTitle>Dein Training</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="label" color="textMuted">
          Ziel
        </AppText>
        <ChipGroup options={goalOptions} value={profile.goal} onChange={(goal) => updateProfile({ goal })} />
        <AppText variant="label" color="textMuted">
          Erfahrung
        </AppText>
        <ChipGroup options={levelOptions} value={profile.level} onChange={(level) => updateProfile({ level })} />
        <AppText variant="label" color="textMuted">
          Trainingstage pro Woche (Wochenziel)
        </AppText>
        <Stepper
          value={profile.trainingDaysPerWeek}
          min={1}
          max={7}
          decimals={0}
          label="Tage"
          onChange={(v) => updateProfile({ trainingDaysPerWeek: Math.round(v) })}
          testID="profil-tage"
        />
        <AppText variant="label" color="textMuted">
          Übliche Trainingsdauer
        </AppText>
        <ChipGroup
          options={durationOptions}
          value={profile.sessionMinutes}
          onChange={(sessionMinutes) => updateProfile({ sessionMinutes })}
          scroll
        />
      </Card>

      <SectionTitle>Ausrüstung & Einheiten</SectionTitle>
      <Card style={styles.group}>
        <ListRow
          icon="dumbbell"
          title="Equipment-Stufen"
          subtitle="Hantelstange, Scheiben, Kurzhanteln, Maschinen – damit nur machbare Gewichte vorgeschlagen werden."
          onPress={() => router.push('/ausruestung')}
          testID="profil-equipment"
        />
        <AppText variant="label" color="textMuted">
          Einheit
        </AppText>
        <ChipGroup options={unitOptions} value={profile.unit} onChange={(unit) => updateProfile({ unit })} />
      </Card>

      <SectionTitle>Konto & Datenschutz</SectionTitle>
      <Card style={styles.group}>
        <AppText variant="small" color="textMuted">
          Kein Tracking, keine Analyse, keine Weitergabe. Deine Daten gehören dir.
        </AppText>
        {!isLocal ? <ListRow icon="logout" title="Abmelden" onPress={() => void signOutUser()} /> : null}
        <ListRow
          icon="trash"
          title={isLocal ? 'Alle Daten löschen' : 'Konto und Daten löschen'}
          destructive
          onPress={() => setConfirmDelete(true)}
        />
      </Card>

      <ConfirmSheet
        visible={confirmDelete}
        title={isLocal ? 'Alle Daten löschen?' : 'Konto wirklich löschen?'}
        message={
          isLocal
            ? 'Alle Trainings, Pläne und Einstellungen auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.'
            : 'Dein Konto und alle Trainingsdaten werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.'
        }
        confirmLabel={busy ? 'Lösche …' : 'Endgültig löschen'}
        destructive
        onConfirm={runDelete}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
      >
        {!isLocal ? (
          <TextField
            label="Passwort zur Bestätigung"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
        ) : null}
        {deleteError ? <AppText color="danger">{deleteError}</AppText> : null}
      </ConfirmSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  account: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  accountIcon: { width: 40, alignItems: 'center' },
  group: { gap: spacing.md },
});
