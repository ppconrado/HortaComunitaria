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
const API_URL = 'http://SEU_IP_LOCAL:3000';

function StatusScreen() {
  const [status, setStatus] = useState({
    soilMoisture: 42,
    temperature: 26,
    humidity: 68,
  });
  useEffect(() => {
    fetch(`${API_URL}/status`)
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>HORTA NORTE</Text>
      <Text style={styles.title}>Saúde da horta</Text>
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
  const toggle = async () => {
    const action = active ? 'off' : 'on';
    setActive(!active);
    try {
      await fetch(`${API_URL}/irrigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      Alert.alert(
        'Modo demonstração',
        'API não conectada; o controle foi atualizado localmente.',
      );
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>CONTROLE REMOTO</Text>
      <Text style={styles.title}>Irrigação</Text>
      <View style={styles.water}>
        <Text style={styles.waterIcon}>◆</Text>
        <Text style={styles.heroLabel}>
          {active ? 'Irrigação ligada' : 'Operação automática'}
        </Text>
      </View>
      <Pressable
        style={[styles.button, active && styles.buttonStop]}
        onPress={toggle}
      >
        <Text style={styles.buttonText}>
          {active ? 'Desligar irrigação' : 'Ligar irrigação'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
function HarvestScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.kicker}>DISTRIBUIÇÃO</Text>
      <Text style={styles.title}>Próximas colheitas</Text>
      {[
        'Alface crespa · Hoje, 16:00',
        'Cebolinha · Amanhã, 08:30',
        'Tomate cereja · 28 set',
      ].map((item) => (
        <View style={styles.harvest} key={item}>
          <Text style={styles.harvestTitle}>{item}</Text>
          <Text style={styles.harvestStatus}>Disponível para retirada</Text>
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
});
