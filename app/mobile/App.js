import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';

const Tab = createBottomTabNavigator();
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.51:3000';

async function requestApi(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Não foi possível comunicar com a API.');
  }
  return body;
}

function StatusScreen() {
  const [status, setStatus] = useState({
    soilMoisture: 42,
    temperature: 26,
    humidity: 68,
  });
  const [error, setError] = useState('');
  useEffect(() => {
    const loadStatus = () =>
      requestApi('/status')
        .then((nextStatus) => {
          setStatus(nextStatus);
          setError('');
        })
        .catch((requestError) => setError(requestError.message));
    loadStatus();
    const refreshTimer = setInterval(loadStatus, 10000);
    return () => clearInterval(refreshTimer);
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>HORTA NORTE</Text>
      <Text style={styles.title}>Saúde da horta</Text>
      {error ? <ConnectionMessage message={error} /> : null}
      <View style={styles.hero}>
        <Text style={styles.heroValue}>{status.soilMoisture}%</Text>
        <Text style={styles.heroLabel}>umidade do solo</Text>
        <Text style={styles.good}>● Atenção moderada</Text>
      </View>
      <View style={styles.row}>
        <Metric label="Temperatura" value={`${status.temperature}°C`} />
        <Metric label="Umidade do ar" value={`${status.humidity}%`} />
      </View>
    </SafeAreaView>
  );
}
function ConnectionMessage({ message }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>API indisponível</Text>
      <Text style={styles.errorText}>{message}</Text>
      <Text style={styles.errorHint}>URL: {API_URL}</Text>
    </View>
  );
}
function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
function IrrigationScreen() {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    requestApi('/status')
      .then((status) => setActive(status.irrigation.active))
      .catch((requestError) => setError(requestError.message));
  }, []);
  const toggle = async () => {
    const action = active ? 'off' : 'on';
    const previous = active;
    setPending(true);
    try {
      const result = await requestApi('/irrigation', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setActive(result.irrigation.active);
      setError('');
    } catch {
      setActive(previous);
      setError('Falha ao enviar o comando de irrigação.');
      Alert.alert('API indisponível', 'O comando não foi enviado.');
    } finally {
      setPending(false);
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>CONTROLE REMOTO</Text>
      <Text style={styles.title}>Irrigação</Text>
      {error ? <ConnectionMessage message={error} /> : null}
      <View style={styles.water}>
        <Text style={styles.waterIcon}>◆</Text>
        <Text style={styles.heroLabel}>
          {active ? 'Irrigação ligada' : 'Operação automática'}
        </Text>
      </View>
      <Pressable
        style={[styles.button, active && styles.buttonStop]}
        onPress={toggle}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending
            ? 'Enviando comando...'
            : active
              ? 'Desligar irrigação'
              : 'Ligar irrigação'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
function HarvestScreen() {
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservingId, setReservingId] = useState(null);

  const loadHarvests = () => {
    setLoading(true);
    requestApi('/harvest')
      .then((nextHarvests) => {
        setHarvests(nextHarvests);
        setError('');
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHarvests();
  }, []);

  const reserve = async (harvest) => {
    setReservingId(harvest.id);
    try {
      const reserved = await requestApi(`/harvest/${harvest.id}/reserve`, {
        method: 'PUT',
        body: JSON.stringify({ reservedBy: 'Morador' }),
      });
      setHarvests((current) =>
        current.map((item) => (item.id === reserved.id ? reserved : item)),
      );
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReservingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>DISTRIBUIÇÃO</Text>
      <Text style={styles.title}>Próximas colheitas</Text>
      {error ? <ConnectionMessage message={error} /> : null}
      {loading ? (
        <Text style={styles.muted}>Carregando colheitas...</Text>
      ) : null}
      {harvests.map((harvest) => (
        <View style={styles.harvest} key={harvest.id}>
          <Text style={styles.harvestTitle}>{harvest.crop}</Text>
          <Text style={styles.harvestMeta}>
            {new Date(harvest.harvestDate).toLocaleString('pt-BR')} ·{' '}
            {harvest.quantity || 'Quantidade a definir'}
          </Text>
          <Text style={styles.harvestStatus}>
            {harvest.available ? 'Disponível para retirada' : 'Reservada'}
          </Text>
          {harvest.available ? (
            <Pressable
              style={styles.reserveButton}
              onPress={() => reserve(harvest)}
              disabled={reservingId === harvest.id}
            >
              <Text style={styles.reserveButtonText}>
                {reservingId === harvest.id ? 'Reservando...' : 'Reservar'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ headerShown: false, tabBarActiveTintColor: '#3f7a4b' }}
      >
        <Tab.Screen name="Status" component={StatusScreen} />
        <Tab.Screen name="Irrigação" component={IrrigationScreen} />
        <Tab.Screen name="Colheitas" component={HarvestScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f3', padding: 24 },
  kicker: { color: '#8a998d', fontSize: 11, letterSpacing: 2, marginTop: 20 },
  title: {
    color: '#294333',
    fontFamily: 'serif',
    fontSize: 32,
    marginTop: 8,
    marginBottom: 26,
  },
  hero: {
    backgroundColor: '#e8f3e8',
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
  },
  heroValue: { color: '#294333', fontSize: 52, fontWeight: '700' },
  heroLabel: { color: '#708273', fontSize: 14, marginTop: 4 },
  good: { color: '#4f8958', fontSize: 13, marginTop: 22 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metric: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flex: 1 },
  metricLabel: { color: '#89958d', fontSize: 11 },
  metricValue: {
    color: '#294333',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 9,
  },
  water: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    backgroundColor: '#e8f3e8',
    borderRadius: 16,
  },
  waterIcon: { color: '#609768', fontSize: 48 },
  button: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#3f7a4b',
    alignItems: 'center',
  },
  buttonStop: { backgroundColor: '#a95656' },
  buttonText: { color: '#fff', fontWeight: '700' },
  harvest: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  harvestTitle: { color: '#425548', fontSize: 15, fontWeight: '600' },
  harvestStatus: { color: '#57925c', fontSize: 12, marginTop: 7 },
  harvestMeta: { color: '#89958d', fontSize: 12, marginTop: 7 },
  reserveButton: {
    marginTop: 12,
    padding: 11,
    borderRadius: 8,
    backgroundColor: '#edf5eb',
    alignItems: 'center',
  },
  reserveButtonText: { color: '#3f7a4b', fontWeight: '700' },
  muted: { color: '#89958d', fontSize: 14, marginBottom: 12 },
  errorBox: {
    backgroundColor: '#fff1ed',
    borderColor: '#f2c9bd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: { color: '#8a493d', fontWeight: '700', fontSize: 13 },
  errorText: { color: '#a56b5d', fontSize: 12, marginTop: 4 },
  errorHint: { color: '#b98273', fontSize: 10, marginTop: 7 },
});
