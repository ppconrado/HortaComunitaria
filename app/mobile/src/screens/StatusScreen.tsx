import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { HortaBackground } from '../components/HortaBackground';
import { MetricCard } from '../components/MetricCard';
import { useRealtimeStatus } from '../hooks/useRealtimeStatus';
import { colors, spacing } from '../styles/theme';

export function StatusScreen() {
  const { status, connected, error } = useRealtimeStatus();
  const soilMoisture = status?.soilMoisture ?? 0;

  return (
    <HortaBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>HORTA NORTE · MONITORAMENTO</Text>
          <Text style={styles.title}>Saúde da horta</Text>
          <ConnectionBanner connected={connected} error={error} />
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="leaf-outline" size={28} color={colors.green} />
            </View>
            <Text style={styles.heroValue}>{status ? `${soilMoisture}%` : '--'}</Text>
            <Text style={styles.heroLabel}>umidade do solo</Text>
            <Text style={styles.heroStatus}>
              {soilMoisture < 40 ? 'Atenção: solo seco' : 'Umidade acompanhada'}
            </Text>
          </View>
          <View style={styles.metrics}>
            <MetricCard
              icon="☀️"
              label="Temperatura"
              value={status ? `${status.temperature}°C` : '--'}
            />
            <MetricCard
              icon="💧"
              label="Umidade do ar"
              value={status ? `${status.humidity}%` : '--'}
            />
          </View>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Estado da irrigação</Text>
            <Text style={styles.noteText}>
              {status?.irrigation.mode === 'manual'
                ? 'O sistema está sob controle manual.'
                : 'O sistema está seguindo os sensores automaticamente.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </HortaBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  kicker: { color: colors.muted, fontSize: 10, letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 31, fontWeight: '800', marginTop: 8, marginBottom: spacing.lg },
  hero: { alignItems: 'center', backgroundColor: 'rgba(229,243,223,0.92)', borderRadius: 26, padding: 26 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  heroValue: { color: colors.ink, fontSize: 56, fontWeight: '800', marginTop: 10 },
  heroLabel: { color: colors.muted, fontSize: 14 },
  heroStatus: { color: colors.green, fontSize: 13, fontWeight: '700', marginTop: 17 },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  note: { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: spacing.md, padding: spacing.md },
  noteTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  noteText: { color: colors.muted, fontSize: 13, marginTop: 5 },
});