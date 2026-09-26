# Horta Comunitária

MVP do projeto integrador HortaUrbana: uma plataforma para monitorar hortas comunitárias, controlar a irrigação com apoio de IoT e organizar a distribuição das colheitas.

## Estado atual

O repositório já contém as três camadas previstas:

- **IoT:** firmware Arduino para ESP32 com sensor de umidade do solo, DHT22, relé, MQTT e irrigação automática por limiar de 40%, com override manual.
- **Backend:** API Express com status, histórico de telemetria, irrigação, calendário e reserva de colheitas. MQTT e MongoDB são ativados quando as variáveis de ambiente estão configuradas; sem infraestrutura externa, a API opera em modo demo.
- **Aplicação:** painel administrativo web em React + TypeScript e aplicativo mobile Expo para status, irrigação e colheitas.

O painel web permite visualizar indicadores, consultar a umidade, ligar/desligar a irrigação em modo demo e cadastrar colheitas. A API publica comandos MQTT quando existe um broker configurado e grava telemetria no MongoDB quando a conexão está disponível.

## Estrutura do repositório

```text
app/web/       React + TypeScript, painel administrativo
app/mobile/    React Native + Expo, aplicativo para moradores/voluntários
backend/       Express, MQTT, MongoDB e API REST
iot/           Firmware ESP32 em Arduino/C++
docs/          Arquitetura e contratos de integração
mosquitto/     Configuração local do broker MQTT
```

## Executar o painel web

```bash
npm --prefix app/web install
npm run dev
```

Abra `http://localhost:5173`.

Para gerar e visualizar o build de produção:

```bash
npm --prefix app/web run build
npm --prefix app/web run preview
```

## Executar a API

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Principais endpoints:

- `GET /health`
- `GET /status`
- `GET /telemetry/history`
- `POST /irrigation` com `{ "action": "on" }` ou `{ "action": "off" }`
- `GET /harvest`
- `POST /harvest`
- `PUT /harvest/:id/reserve`

## Executar as três camadas com Docker

Com Docker Desktop instalado:

```bash
docker compose up --build
```

- Painel web: `http://localhost:8080`
- API: `http://localhost:3000`
- MongoDB: porta `27017` na rede Docker
- Mosquitto: `localhost:1883`

## Configuração MQTT e MongoDB

Copie `backend/.env.example` para `backend/.env` quando executar o backend fora do Docker:

```env
PORT=3000
MQTT_BROKER=mqtt://localhost:1883
MQTT_TELEMETRY_TOPIC=horta/telemetry
MQTT_IRRIGATION_TOPIC=horta/irrigation
MONGO_URI=mongodb://localhost:27017/horta-comunitaria
```

Tópicos MQTT:

- `horta/telemetry`: telemetria do ESP32.
- `horta/irrigation`: comandos `on` e `off` para o relé.

## Próximas evoluções

Estas funcionalidades fazem parte do roadmap e ainda não devem ser apresentadas como concluídas:

1. Conectar o aplicativo mobile à API com autenticação e configuração de ambiente por dispositivo.
2. Criar autenticação e perfis separados para voluntários e moradores.
3. Persistir também colheitas e reservas em MongoDB, substituindo o armazenamento temporário em memória.
4. Adicionar testes automatizados de API e testes ponta a ponta com simulador MQTT.
5. Implementar alertas, relatórios de eficiência hídrica e histórico visual no painel.
6. Validar o circuito ESP32, relé e válvula em bancada antes do uso em campo.

## Documentação técnica

A visão das integrações entre sensor, MQTT, backend, banco, web, mobile e atuador está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
