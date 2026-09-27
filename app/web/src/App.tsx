import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

function buildChartPoints(history: Telemetry[]) {
  if (history.length < 2) return '0,115 720,115';
  const values = history.map((item) => item.soilMoisture);
  const maximum = Math.max(...values, 80);
  const minimum = Math.min(...values, 0);
  const range = Math.max(maximum - minimum, 1);
  return history
    .map((item, index) => {
      const x = (index / (history.length - 1)) * 720;
      const y = 210 - ((item.soilMoisture - minimum) / range) * 180;
      return `${x},${y}`;
    })
    .join(' ');
}

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
  const chartPoints = buildChartPoints(chartHistory);
  const filteredHarvests = harvests.filter(
    (harvest) => harvestFilter === 'all' || harvest.available,
  );
  const apiOnline = Boolean(status) && !requestError;
  const statusLabel = useMemo(
    () =>
      irrigationOn ? 'Irrigação manual ativa' : 'Operação automática ativa',
    [irrigationOn],
  );

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
    const refreshTimer = window.setInterval(() => {
      requestApi<Status>('/status')
        .then(setStatus)
        .then(() => {
          setLastSyncedAt(new Date().toISOString());
          setCurrentTime(Date.now());
        })
        .catch((error: unknown) =>
          setRequestError(
            error instanceof Error ? error.message : 'API indisponível.',
          ),
        );
    }, 10000);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
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
          <span className="brand-mark">+</span>
          <span>
            Horta
            <br />
            <strong>Comunitária</strong>
          </span>
        </div>
        <div className="workspace-label">ESPAÇO DE GESTÃO</div>
        <nav aria-label="Navegação principal">
          {['Visão geral', 'Irrigação', 'Colheitas', 'Histórico'].map(
            (item, index) => (
              <button
                key={item}
                className={
                  activeSection === item ? 'nav-item active' : 'nav-item'
                }
                onClick={() => setActiveSection(item)}
              >
                <span
                  className={`nav-icon icon-${index}`}
                  aria-hidden="true"
                ></span>
                {item}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <span
            className={apiOnline ? 'online-dot' : 'online-dot offline'}
          ></span>
          <div>
            <strong>{apiOnline ? 'Sistema online' : 'API desconectada'}</strong>
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
              <span className="bell-icon"></span>
              <i></i>
            </button>
            <div className="profile">
              <span className="avatar">JS</span>
              <div>
                <strong>José Silva</strong>
                <small>Voluntário</small>
              </div>
              <span className="chevron">⌄</span>
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
                <span>+</span> Nova colheita
              </button>
            )}
          </div>
          <div
            className={`alert-banner ${activeSection === 'Colheitas' || activeSection === 'Histórico' ? 'section-hidden' : ''}`}
          >
            <span className="alert-icon">!</span>
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
                <span className="calendar-mini">▣</span>
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
                <div className="chart-y">
                  <span>80%</span>
                  <span>60%</span>
                  <span>40%</span>
                  <span>20%</span>
                  <span>0%</span>
                </div>
                <div className="chart-area">
                  <div className="grid-lines">
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                  <svg
                    viewBox="0 0 720 230"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Gráfico de umidade do solo"
                  >
                    <defs>
                      <linearGradient
                        id="area-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0" stopColor="#7cae7f" stopOpacity=".3" />
                        <stop offset="1" stopColor="#7cae7f" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      points={chartPoints}
                      fill="none"
                      stroke="#3f7a4b"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={`${chartPoints} 720,230 0,230`}
                      fill="url(#area-fill)"
                    />
                  </svg>
                  <div className="chart-labels">
                    <span>00:00</span>
                    <span>04:00</span>
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>Agora</span>
                  </div>
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
                  <span className="drop">◆</span>
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
                <span>{irrigationOn ? '■' : '▶'}</span>
                {irrigationPending
                  ? 'Enviando comando...'
                  : irrigationOn
                    ? 'Desligar irrigação'
                    : 'Ligar irrigação'}
              </button>
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
