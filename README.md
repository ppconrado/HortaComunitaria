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

Para validar a infraestrutura completa, confirme a saúde dos serviços:

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3000/status
```

O fluxo MQTT pode ser testado publicando uma telemetria diretamente no broker:

```bash
docker compose exec -T mosquitto mosquitto_pub \
  -h localhost -p 1883 -t horta/telemetry \
  -m '{"soilMoisture":67,"temperature":25.1,"humidity":59.8}'
```

Depois, consulte `http://localhost:3000/status`. Os valores publicados devem aparecer na resposta da API. O Compose aguarda MongoDB e Mosquitto ficarem saudáveis antes de iniciar o backend, e aguarda o backend antes de iniciar o painel web.

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

A base já sobe em Docker e possui o fluxo MQTT descrito, mas o backend ainda mistura operação real com modo demo: telemetria histórica é limitada em memória e colheitas/reservas não persistem. Vou confirmar agora como os clientes consomem a API e se há alguma lacuna de configuração que impeça o primeiro funcionamento integrado.

O próximo passo técnico é substituir os dados locais do painel web pelo backend real e, em paralelo, tornar a configuração de rede do mobile e do ESP32 explícita. Sem isso, a interface aparenta funcionar, mas não representa o estado do sistema; o teste decisivo é publicar uma telemetria MQTT e observar o mesmo valor em `/status`, web e mobile.

O próximo passo é **conectar o painel web ao backend real** e validar o fluxo completo:

`ESP32 → MQTT → Backend → MongoDB → Web/Mobile`

Atualmente, o backend já recebe MQTT, mas o web ainda usa dados locais e o mobile possui `API_URL` provisório. Portanto, a interface ainda não reflete o estado real da horta.

**Plano de implementação**

**Fase 1: Validar a infraestrutura**

1. Executar `docker compose up --build`.
2. Confirmar:
   - `GET http://localhost:3000/health`
   - MongoDB conectado.
   - Mosquitto acessível na porta `1883`.
   - Painel web disponível em `http://localhost:8080`.
3. Publicar uma telemetria MQTT manualmente.
4. Confirmar que o valor aparece em `GET /status`.

Critério de aceite: uma mensagem publicada em `horta/telemetry` altera o status retornado pela API.

**Fase 2: Integrar o painel web**

Alterar `App.tsx` para:

- Buscar dados de `/status`.
- Buscar histórico em `/telemetry/history`.
- Buscar colheitas em `/harvest`.
- Enviar comandos reais para `/irrigation`.
- Criar colheitas via `POST /harvest`.
- Exibir estados de carregamento, erro e API offline.
- Configurar a URL da API por variável de ambiente, por exemplo `VITE_API_URL`.

Também será necessário substituir os valores fixos de umidade, temperatura, irrigação e colheitas.

Critério de aceite: ligar a irrigação no painel publica o comando MQTT e o status exibido é atualizado pela API.

**Fase 3: Corrigir a persistência**

O arquivo `index.js` ainda armazena colheitas e reservas em memória. Criar modelos MongoDB para:

- Colheitas.
- Reservas.
- Estado atual da irrigação, se necessário.
- Histórico de telemetria já parcialmente existente.

Critério de aceite: reiniciar o container do backend sem perder colheitas, reservas ou histórico.

**Fase 4: Integrar o aplicativo mobile**

Alterar `App.js` para:

- Remover `http://SEU_IP_LOCAL:3000`.
- Usar configuração por ambiente ou arquivo de configuração.
- Buscar status periodicamente.
- Buscar colheitas pela API.
- Permitir reservar uma colheita.
- Reverter o botão de irrigação se a requisição falhar.
- Mostrar estados de conexão e erro.

No celular físico, a API deve usar o IP da máquina na rede local, não `localhost`.

Critério de aceite: web e mobile exibem o mesmo status e controlam a mesma irrigação.

**Fase 5: Validar o firmware**

Revisar `HortaComunitaria.ino`:

- Configurar SSID, senha e IP do broker.
- Confirmar se o relé é acionado com nível alto ou baixo.
- Tratar leituras inválidas do DHT22.
- Publicar timestamp na telemetria.
- Definir como o modo manual retorna ao modo automático.
- Adicionar mecanismo de segurança para desligar a irrigação após tempo máximo.
- Evitar que a irrigação continue ligada após perda de conexão MQTT.

Critério de aceite: o ESP32 publica telemetria a cada 10 segundos, responde ao comando MQTT e não mantém a válvula ligada em caso de falha.

**Fase 6: Segurança e usuários**

Depois do fluxo técnico funcionar:

- Adicionar autenticação.
- Criar perfis de voluntário e morador.
- Restringir controle de irrigação a usuários autorizados.
- Validar entrada das rotas.
- Adicionar rate limit.
- Configurar autenticação ou ACL no Mosquitto.
- Remover credenciais e configurações sensíveis do código-fonte.

**Fase 7: Testes e operação**

Criar:

- Testes unitários das regras de irrigação e reservas.
- Testes de API para status, colheitas e comandos.
- Teste de integração MQTT.
- Teste ponta a ponta:
  - publicar telemetria;
  - verificar backend;
  - verificar web/mobile;
  - enviar comando;
  - confirmar resposta do ESP32.
- Healthchecks no Docker Compose.
- Logs estruturados.
- Backup do MongoDB.

**Ordem recomendada de execução**

1. Validar Docker, MQTT e MongoDB.
2. Integrar o web com a API.
3. Persistir colheitas e reservas.
4. Configurar o mobile.
5. Validar e proteger o firmware.
6. Adicionar autenticação.
7. Automatizar testes e operação.

A primeira entrega funcional deve ser: **telemetria real aparecendo no web e comando de irrigação chegando ao ESP32**. Esse é o menor fluxo que comprova que o sistema completo está realmente integrado.

## Documentação técnica

A visão das integrações entre sensor, MQTT, backend, banco, web, mobile e atuador está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
