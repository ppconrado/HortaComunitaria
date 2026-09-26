import { useMemo, useState } from 'react';
import './App.css';

type Harvest = {
  crop: string;
  date: string;
  quantity: string;
  status: 'Pronta' | 'Em breve';
};
const initialHarvests: Harvest[] = [
  {
    crop: 'Alface crespa',
    date: 'Hoje, 16:00',
    quantity: '24 unidades',
    status: 'Pronta',
  },
  {
    crop: 'Cebolinha',
    date: 'Amanhã, 08:30',
    quantity: '18 maços',
    status: 'Em breve',
  },
  {
    crop: 'Tomate cereja',
    date: '28 set, 09:00',
    quantity: '12 kg',
    status: 'Em breve',
  },
];

function App() {
  const [activeSection, setActiveSection] = useState('Visão geral');
  const [irrigationOn, setIrrigationOn] = useState(false);
  const [harvests, setHarvests] = useState(initialHarvests);
  const [showForm, setShowForm] = useState(false);
  const [newCrop, setNewCrop] = useState('');
  const [newDate, setNewDate] = useState('');
  const statusLabel = useMemo(
    () =>
      irrigationOn ? 'Irrigação manual ativa' : 'Operação automática ativa',
    [irrigationOn],
  );

  function addHarvest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCrop || !newDate) return;
    setHarvests((current) => [
      ...current,
      {
        crop: newCrop,
        date: newDate,
        quantity: 'A definir',
        status: 'Em breve',
      },
    ]);
    setNewCrop('');
    setNewDate('');
    setShowForm(false);
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
          <span className="online-dot"></span>
          <div>
            <strong>Sistema online</strong>
            <small>Última sincronização há 2 min</small>
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
          <div className="page-heading">
            <div>
              <p className="eyebrow">SÁBADO, 26 DE SETEMBRO DE 2026</p>
              <h1>
                Bom dia, José <span>☀</span>
              </h1>
              <p className="subheading">
                Aqui está o que está acontecendo na horta hoje.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              <span>+</span> Nova colheita
            </button>
          </div>
          <div className="alert-banner">
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
          <div className="stats-grid">
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
                42<small>%</small>
              </div>
              <div className="stat-foot">Ideal entre 50% e 70%</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>TEMPERATURA</span>
                <span className="status-pill healthy">Ideal</span>
              </div>
              <div className="stat-value">
                26<small>°C</small>
              </div>
              <div className="stat-foot">
                Umidade do ar: <strong>68%</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>PRÓXIMA COLHEITA</span>
                <span className="calendar-mini">▣</span>
              </div>
              <div className="stat-value date-value">Hoje</div>
              <div className="stat-foot">
                <strong>Alface crespa</strong> · 16:00
              </div>
            </div>
          </div>
          <div className="dashboard-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Umidade do solo</h2>
                  <p>Últimas 24 horas</p>
                </div>
                <button className="select-button">
                  24 horas <span>⌄</span>
                </button>
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
                      d="M0,115 C50,120 60,130 115,92 S180,112 230,137 S290,130 340,152 S400,128 455,142 S510,95 560,110 S625,67 720,86 L720,230 L0,230Z"
                      fill="url(#area-fill)"
                    />
                    <path
                      d="M0,115 C50,120 60,130 115,92 S180,112 230,137 S290,130 340,152 S400,128 455,142 S510,95 560,110 S625,67 720,86"
                      fill="none"
                      stroke="#3f7a4b"
                      strokeWidth="3"
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
            <section className="panel irrigation-panel">
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
                onClick={() => setIrrigationOn(!irrigationOn)}
              >
                <span>{irrigationOn ? '■' : '▶'}</span>
                {irrigationOn ? 'Desligar irrigação' : 'Ligar irrigação'}
              </button>
            </section>
          </div>
          <section className="panel harvest-panel">
            <div className="panel-heading">
              <div>
                <h2>Próximas colheitas</h2>
                <p>Organize a distribuição dos alimentos</p>
              </div>
              <button
                className="text-button"
                onClick={() => setActiveSection('Colheitas')}
              >
                Ver calendário <span>→</span>
              </button>
            </div>
            <div className="harvest-list">
              {harvests.map((harvest) => (
                <div
                  className="harvest-row"
                  key={`${harvest.crop}-${harvest.date}`}
                >
                  <div className="crop-avatar">{harvest.crop.charAt(0)}</div>
                  <div className="crop-info">
                    <strong>{harvest.crop}</strong>
                    <span>
                      {harvest.date} · {harvest.quantity}
                    </span>
                  </div>
                  <span
                    className={
                      harvest.status === 'Pronta'
                        ? 'status-pill ready'
                        : 'status-pill upcoming'
                    }
                  >
                    {harvest.status}
                  </span>
                  <button
                    className="row-menu"
                    aria-label={`Mais opções para ${harvest.crop}`}
                  >
                    •••
                  </button>
                </div>
              ))}
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
              />
            </label>
            <label>
              Data e horário
              <input
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                placeholder="Ex.: 30 set, 09:00"
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
