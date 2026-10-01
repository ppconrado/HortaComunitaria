import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../styles/theme';

type Props = { connected: boolean; error?: string; label?: string };

export function ConnectionBanner({ connected, error, label = 'Atualização em tempo real' }: Props) {
  return (
    <View style={[styles.container, connected ? styles.online : styles.offline]}>
      <Ionicons
        name={connected ? 'radio-outline' : 'cloud-offline-outline'}
        size={16}
        color={connected ? colors.green : colors.danger}
      />
      <Text style={styles.label}>
        {connected ? label : error || 'API desconectada'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  online: { backgroundColor: '#e8f4e5' },
  offline: { backgroundColor: colors.dangerBackground },
  label: { color: colors.muted, flex: 1, fontSize: 12 },
});