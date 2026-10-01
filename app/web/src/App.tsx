import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Droplets,
  History,
  LayoutDashboard,
  Play,
  Plus,
  Sprout,
  Square,
  TriangleAlert,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { io } from 'socket.io-client';
import './App.css';

type Harvest = {
  id?: string;
  crop: string;
  harvestDate: string;
  quantity: number;
  available: boolean;
  reservedBy?: string;
  reservedAt?: string;
};

type Telemetry = {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  timestamp: string;
  irrigationOn?: boolean;
  mode?: 'manual' | 'automatic';
};

type Status = Telemetry & {
  irrigation: {
    active: boolean;
    mode: string;
    updatedAt: string;
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function requestApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Não foi possível comunicar com a API.');
  }
  return body as T;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const navigationItems = [
  { label: 'Visão geral', Icon: LayoutDashboard },
  { label: 'Irrigação', Icon: Droplets },
  { label: 'Colheitas', Icon: Sprout },
  { label: 'Histórico', Icon: History },
];

function App() {
  const [activeSection, setActiveSection] = useState('Visão geral');
  const [status, setStatus] = useState<Status | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [harvestFilter, setHarvestFilter] = useState<'all' | 'available'>(
    'all',
  );
  const [historyRange, setHistoryRange] = useState('24');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [irrigationPending, setIrrigationPending] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCrop, setNewCrop] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const irrigationOn = status?.irrigation.active ?? false;
  const latestTelemetry = status;
  const rangeHours = Number(historyRange);
  const chartHistory = [...history]
    .reverse()
    .filter(
      (item) =>
        currentTime - new Date(item.timestamp).getTime() <=
        rangeHours * 60 * 60 * 1000,
    )
    .slice(-24);
  const chartData = chartHistory.map((item) => ({
    ...item,
    label: new Date(item.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
  const filteredHarvests = harvests.filter(
    (harvest) => harvestFilter === 'all' || harvest.available,
  );
  const apiOnline = Boolean(status) && !requestError;
  const statusLabel = useMemo(() => {
    if (status?.irrigation.mode === 'manual') {
      return irrigationOn
        ? 'Irrigação manual ativa'
        : 'Irrigação manual desligada';
    }
    return 'Operação automática ativa';
  }, [irrigationOn, status?.irrigation.mode]);

  async function loadDashboard() {
    try {
      const [nextStatus, nextHistory, nextHarvests] = await Promise.all([
        requestApi<Status>('/status'),
        requestApi<Telemetry[]>('/telemetry/history'),
        requestApi<Harvest[]>('/harvest'),
      ]);
      setStatus(nextStatus);
      setHistory(nextHistory);
      setHarvests(nextHarvests);
      setLastSyncedAt(new Date().toISOString());
      setCurrentTime(Date.now());
      setRequestError('');
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'API indisponível.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    const handleStatusUpdate = (nextStatus: Status) => {
      setStatus(nextStatus);
      setLastSyncedAt(new Date().toISOString());
      setCurrentTime(Date.now());
      setRequestError('');
    };
    const handleTelemetryUpdate = (telemetry: Telemetry) => {
      setHistory((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.timestamp !== telemetry.timestamp,
        );
        return [telemetry, ...withoutDuplicate].slice(0, 100);
      });
    };
    socket.on('connect', () => {
      setSocketConnected(true);
      setRequestError('');
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => {
      setSocketConnected(false);
      setRequestError('Conexão realtime indisponível.');
    });
    socket.on('status:update', handleStatusUpdate);
    socket.on('telemetry:update', handleTelemetryUpdate);
    return () => {
      window.clearTimeout(initialLoadTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  async function toggleIrrigation() {
    setIrrigationPending(true);
    try {
      const nextStatus = await requestApi<{ irrigation: Status['irrigation'] }>(
        '/irrigation',
        {
          method: 'POST',
          body: JSON.stringify({ action: irrigationOn ? 'off' : 'on' }),
        },
      );
      setStatus((current) =>
        current ? { ...current, irrigation: nextStatus.irrigation } : current,
      );
      setRequestError('');
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Falha ao controlar irrigação.',
      );
    } finally {
      setIrrigationPending(false);
    }
  }

  async function resumeAutomatic() {
    setIrrigationPending(true);
    try {
      const nextStatus = await requestApi<{ irrigation: Status['irrigation'] }>(
        '/irrigation',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'auto' }),
        },
      );
      setStatus((current) =>
        current ? { ...current, irrigation: nextStatus.irrigation } : current,
      );
      setRequestError('');
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Falha ao retomar automático.',
      );
    } finally {
      setIrrigationPending(false);
    }
  }

  async function reserveHarvest(harvest: Harvest) {
    if (!harvest.id || !harvest.available) return;
    setReservingId(harvest.id);
    try {
      const reserved = await requestApi<Harvest>(
        `/harvest/${harvest.id}/reserve`,
        {
          method: 'PUT',
          body: JSON.stringify({ reservedBy: 'José Silva' }),
        },
      );
      setHarvests((current) =>
        current.map((item) => (item.id === reserved.id ? reserved : item)),
      );
      setRequestError('');
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Falha ao reservar colheita.',
      );
    } finally {
      setReservingId(null);
    }
  }

  async function addHarvest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCrop || !newDate) return;
    try {
      const harvest = await requestApi<Harvest>('/harvest', {
        method: 'POST',
        body: JSON.stringify({
          crop: newCrop,
          harvestDate: newDate,
          quantity: Number(newQuantity || 0),
        }),
      });
      setHarvests((current) => [...current, harvest]);
      setNewCrop('');
      setNewDate('');
      setNewQuantity('');
      setShowForm(false);
      setRequestError('');
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Falha ao criar colheita.',
      );
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Plus size={18} strokeWidth={2.2} />
          </span>
          <span>
            Horta
            <br />
            <strong>Comunitária</strong>
          </span>
        </div>
        <div className="workspace-label">ESPAÇO DE GESTÃO</div>
        <nav aria-label="Navegação principal">
          {navigationItems.map(({ label, Icon }) => (
              <button
                key={label}
                className={
                  activeSection === label ? 'nav-item active' : 'nav-item'
                }
                onClick={() => setActiveSection(label)}
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            ))}
        </nav>
        <div className="sidebar-footer">
          <span
            className={
              apiOnline && socketConnected ? 'online-dot' : 'online-dot offline'
            }
          ></span>
          <div>
            <strong>
              {apiOnline && socketConnected
                ? 'Sistema online'
                : 'Realtime desconectado'}
            </strong>
            <small>
              {lastSyncedAt
                ? `Sincronizado às ${new Date(lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Aguardando sincronização'}
            </small>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Horta Norte <span>/</span> <strong>{activeSection}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificações">
              <Bell size={17} strokeWidth={1.8} />
              <i></i>
            </button>
            <div className="profile">
              <span className="avatar">JS</span>
              <div>
                <strong>José Silva</strong>
                <small>Voluntário</small>
              </div>
              <ChevronDown size={16} className="chevron" />
            </div>
          </div>
        </header>
        <section className="content-wrap">
          {requestError && (
            <div className="api-error" role="alert">
              <strong>API indisponível</strong>
              <span>{requestError}</span>
              <button onClick={loadDashboard}>Tentar novamente</button>
            </div>
          )}
          {loading && (
            <div className="loading-state">Carregando dados da horta...</div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Intl.DateTimeFormat('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
                  .format(new Date())
                  .toUpperCase()}
              </p>
              <h1>
                {activeSection === 'Visão geral'
                  ? 'Bom dia, José'
                  : activeSection}
                {activeSection === 'Visão geral' && <span>☀</span>}
              </h1>
              <p className="subheading">
                {activeSection === 'Colheitas'
                  ? 'Cadastre, acompanhe e reserve alimentos da horta.'
                  : activeSection === 'Histórico'
                    ? 'Acompanhe a evolução da umidade do solo.'
                    : activeSection === 'Irrigação'
                      ? 'Controle o sistema e acompanhe o estado atual.'
                      : 'Aqui está o que está acontecendo na horta hoje.'}
              </p>
            </div>
            {(activeSection === 'Visão geral' ||
              activeSection === 'Colheitas') && (
              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                <Plus size={16} strokeWidth={2} /> Nova colheita
              </button>
            )}
          </div>
          <div
            className={`alert-banner ${activeSection === 'Colheitas' || activeSection === 'Histórico' ? 'section-hidden' : ''}`}
          >
            <span className="alert-icon">
              <TriangleAlert size={14} strokeWidth={2} />
            </span>
            <div>
              <strong>Atenção necessária</strong>
              <p>O canteiro de tomates está com umidade abaixo do ideal.</p>
            </div>
            <button
              className="alert-link"
              onClick={() => setActiveSection('Irrigação')}
            >
              Ver irrigação <span>→</span>
            </button>
          </div>
          <div
            className={`stats-grid ${activeSection !== 'Visão geral' ? 'section-hidden' : ''}`}
          >
            <div className="stat-card">
              <div className="stat-top">
                <span>SAÚDE DA HORTA</span>
                <span className="status-pill healthy">Saudável</span>
              </div>
              <div className="stat-value">
                Boa <span className="leaf-icon">✦</span>
              </div>
              <div className="stat-foot">
                <span className="trend up">↗ 8%</span> desde ontem
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>UMIDADE DO SOLO</span>
                <span className="status-pill attention">Atenção</span>
              </div>
              <div className="stat-value">
                {latestTelemetry?.soilMoisture ?? '--'}
                <small>%</small>
              </div>
              <div className="stat-foot">Ideal entre 50% e 70%</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>TEMPERATURA</span>
                <span className="status-pill healthy">Ideal</span>
              </div>
              <div className="stat-value">
                {latestTelemetry?.temperature ?? '--'}
                <small>°C</small>
              </div>
              <div className="stat-foot">
                Umidade do ar:{' '}
                <strong>{latestTelemetry?.humidity ?? '--'}%</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>PRÓXIMA COLHEITA</span>
                <CalendarDays size={18} className="calendar-mini" />
              </div>
              <div className="stat-value date-value">
                {harvests[0] ? formatDate(harvests[0].harvestDate) : '--'}
              </div>
              <div className="stat-foot">
                {harvests[0] ? (
                  <strong>{harvests[0].crop}</strong>
                ) : (
                  'Sem colheitas cadastradas'
                )}
              </div>
            </div>
          </div>
          <div
            className={`dashboard-grid ${activeSection === 'Colheitas' ? 'section-hidden' : ''}`}
          >
            <section
              className={`panel chart-panel ${activeSection !== 'Visão geral' && activeSection !== 'Histórico' ? 'section-hidden' : ''}`}
            >
              <div className="panel-heading">
                <div>
                  <h2>Umidade do solo</h2>
                  <p>Últimas 24 horas</p>
                </div>
                <select
                  className="select-button"
                  value={historyRange}
                  onChange={(event) => setHistoryRange(event.target.value)}
                  aria-label="Período do histórico"
                >
                  <option value="24">24 horas</option>
                  <option value="168">7 dias</option>
                  <option value="720">30 dias</option>
                </select>
              </div>
              <div className="chart">
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height={207}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 12, right: 8, bottom: 4, left: 0 }}
                      role="img"
                      aria-label="Gráfico de umidade do solo"
                    >
                      <CartesianGrid stroke="#e8ede7" strokeDasharray="3 3" />
                      <ReferenceArea
                        y1={50}
                        y2={70}
                        fill="#7cae7f"
                        fillOpacity={0.12}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#aab3ac', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        tick={{ fill: '#aab3ac', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                        width={34}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Umidade']}
                        contentStyle={{
                          border: '1px solid #e4e9e2',
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="soilMoisture"
                        stroke="#3f7a4b"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3f7a4b' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-dot"></i> Umidade registrada
                </span>
                <span>
                  <i className="legend-line"></i> Faixa ideal: 50% - 70%
                </span>
              </div>
            </section>
            <section
              className={`panel irrigation-panel ${activeSection !== 'Visão geral' && activeSection !== 'Irrigação' ? 'section-hidden' : ''}`}
            >
              <div className="panel-heading">
                <div>
                  <h2>Irrigação</h2>
                  <p>Controle do sistema</p>
                </div>
                <span
                  className={irrigationOn ? 'toggle-label on' : 'toggle-label'}
                >
                  {irrigationOn ? 'Ligada' : 'Desligada'}
                </span>
              </div>
              <div
                className={
                  irrigationOn ? 'water-visual running' : 'water-visual'
                }
              >
                <div className="water-circle">
                  <Droplets size={28} className="drop" />
                </div>
                <div className="ripple ripple-one"></div>
                <div className="ripple ripple-two"></div>
              </div>
              <div className="irrigation-state">
                <strong>{statusLabel}</strong>
                <span>Último ciclo: hoje, 06:15 · 8 min</span>
              </div>
              <button
                className={
                  irrigationOn ? 'irrigation-button stop' : 'irrigation-button'
                }
                onClick={toggleIrrigation}
                disabled={irrigationPending || !status}
              >
                {irrigationOn ? <Square size={12} /> : <Play size={12} />}
                {irrigationPending
                  ? 'Enviando comando...'
                  : irrigationOn
                    ? 'Desligar irrigação'
                    : 'Ligar irrigação'}
              </button>
              {status?.irrigation.mode === 'manual' && (
                <button
                  className="text-button automatic-button"
                  onClick={resumeAutomatic}
                  disabled={irrigationPending}
                >
                  Retomar modo automático
                </button>
              )}
            </section>
          </div>
          <section
            className={`panel harvest-panel ${activeSection !== 'Visão geral' && activeSection !== 'Colheitas' ? 'section-hidden' : ''}`}
          >
            <div className="panel-heading">
              <div>
                <h2>Próximas colheitas</h2>
                <p>Organize a distribuição dos alimentos</p>
              </div>
              {activeSection === 'Visão geral' ? (
                <button
                  className="text-button"
                  onClick={() => setActiveSection('Colheitas')}
                >
                  Ver calendário <span>→</span>
                </button>
              ) : (
                <select
                  className="select-button"
                  value={harvestFilter}
                  onChange={(event) =>
                    setHarvestFilter(event.target.value as 'all' | 'available')
                  }
                  aria-label="Filtrar colheitas"
                >
                  <option value="all">Todas</option>
                  <option value="available">Disponíveis</option>
                </select>
              )}
            </div>
            <div className="harvest-list">
              {filteredHarvests.map((harvest) => (
                <div
                  className="harvest-row"
                  key={harvest.id || `${harvest.crop}-${harvest.harvestDate}`}
                >
                  <div className="crop-avatar">{harvest.crop.charAt(0)}</div>
                  <div className="crop-info">
                    <strong>{harvest.crop}</strong>
                    <span>
                      {formatDate(harvest.harvestDate)} ·{' '}
                      {harvest.quantity || 'A definir'}
                    </span>
                  </div>
                  <span
                    className={
                      harvest.available
                        ? 'status-pill ready'
                        : 'status-pill upcoming'
                    }
                  >
                    {harvest.available ? 'Disponível' : 'Reservada'}
                  </span>
                  {activeSection === 'Colheitas' && harvest.available && (
                    <button
                      className="reserve-button"
                      onClick={() => reserveHarvest(harvest)}
                      disabled={reservingId === harvest.id}
                    >
                      {reservingId === harvest.id
                        ? 'Reservando...'
                        : 'Reservar'}
                    </button>
                  )}
                </div>
              ))}
              {!filteredHarvests.length && (
                <div className="empty-state">Nenhuma colheita encontrada.</div>
              )}
            </div>
          </section>
          <footer className="page-footer">
            <span>
              <span className="footer-leaf">✦</span> Cultivando juntos, colhendo
              futuro.
            </span>
            <span>Horta Norte · Piloto comunitário</span>
          </footer>
        </section>
      </main>
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="modal"
            onSubmit={addHarvest}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
            <p className="eyebrow">CALENDÁRIO</p>
            <h2>Nova colheita</h2>
            <label>
              Hortaliça
              <input
                value={newCrop}
                onChange={(event) => setNewCrop(event.target.value)}
                placeholder="Ex.: Manjericão"
                required
              />
            </label>
            <label>
              Data e horário
              <input
                type="datetime-local"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                required
              />
            </label>
            <label>
              Quantidade
              <input
                type="number"
                min="0"
                step="1"
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
                placeholder="Ex.: 24"
              />
            </label>
            <button className="primary-button" type="submit">
              Adicionar ao calendário
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
