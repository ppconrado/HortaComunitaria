import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { HortaBackground } from '../components/HortaBackground';
import { getHarvests, reserveHarvest } from '../services/api';
import type { Harvest } from '../types/api';
import { colors, spacing } from '../styles/theme';

export function HarvestScreen() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservingId, setReservingId] = useState<string | null>(null);

  useEffect(() => {
    getHarvests()
      .then(setHarvests)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const reserve = async (harvest: Harvest) => {
    setReservingId(harvest.id);
    try {
      const reserved = await reserveHarvest(harvest.id);
      setHarvests((current) => current.map((item) => (item.id === reserved.id ? reserved : item)));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao reservar.');
    } finally {
      setReservingId(null);
    }
  };

  return (
    <HortaBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>DISTRIBUIÇÃO COMUNITÁRIA</Text>
          <Text style={styles.title}>Próximas colheitas</Text>
          <ConnectionBanner connected={!error} error={error} label="API conectada" />
          {loading && <Text style={styles.muted}>Carregando colheitas...</Text>}
          {!loading && harvests.length === 0 && <Text style={styles.muted}>Nenhuma colheita cadastrada.</Text>}
          {harvests.map((harvest) => (
            <View key={harvest.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{harvest.crop.charAt(0)}</Text></View>
                <View style={styles.info}>
                  <Text style={styles.crop}>{harvest.crop}</Text>
                  <Text style={styles.meta}>{new Date(harvest.harvestDate).toLocaleString('pt-BR')}</Text>
                </View>
                <Text style={harvest.available ? styles.available : styles.reserved}>
                  {harvest.available ? 'Disponível' : 'Reservada'}
                </Text>
              </View>
              <Text style={styles.quantity}>{harvest.quantity || 'Quantidade a definir'}</Text>
              {harvest.available && (
                <Pressable style={styles.button} disabled={reservingId === harvest.id} onPress={() => reserve(harvest)}>
                  <Text style={styles.buttonText}>{reservingId === harvest.id ? 'Reservando...' : 'Reservar colheita'}</Text>
                </Pressable>
              )}
            </View>
          ))}
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
  muted: { color: colors.muted, fontSize: 14, paddingVertical: spacing.lg },
  card: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  cardTop: { alignItems: 'center', flexDirection: 'row' },
  avatar: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: colors.green, fontSize: 21, fontWeight: '800' },
  info: { flex: 1, marginLeft: spacing.sm },
  crop: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  available: { color: colors.green, fontSize: 11, fontWeight: '800' },
  reserved: { color: colors.warning, fontSize: 11, fontWeight: '800' },
  quantity: { color: colors.muted, fontSize: 13, marginTop: spacing.md },
  button: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 11, marginTop: spacing.md, padding: 12 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});