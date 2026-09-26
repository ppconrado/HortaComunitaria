# Horta Comunitária

MVP do projeto integrador HortaUrbana: painel operacional para voluntários, com monitoramento de sensores, controle híbrido de irrigação e agenda de colheitas.

## Executar o painel

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O painel inicia com dados de demonstração e permite testar a irrigação e o cadastro de colheitas sem infraestrutura externa.

## Executar a API

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

A API expõe `GET /status`, `GET /telemetry/history`, `POST /irrigation`, `GET/POST /harvest` e `PUT /harvest/:id/reserve`. Com `MQTT_BROKER` configurado, ela assina telemetria e publica comandos de irrigação; sem broker ou banco, continua funcionando em modo demo.

## Arquitetura evolutiva

- `src/`: aplicação React + TypeScript do painel web administrativo.
- `backend/`: API Express com contratos compatíveis com o fluxo sensor -> backend -> app -> atuador.
- `iot/`: firmware Arduino para ESP32 com DHT22, sensor de solo, relé, limiar automático e override MQTT.
- `app/mobile/`: aplicativo Expo com status, irrigação e colheitas.
- `docs/`: arquitetura e contratos de integração.

## Subir a apresentação completa

Com Docker instalado, execute `docker compose up --build`. O painel web ficará em `http://localhost:8080`, a API em `http://localhost:3000`, MongoDB será usado para a evolução da persistência e Mosquitto ficará disponível na porta `1883`.

O modo demo existe para permitir validação de UX e fluxo operacional antes da instalação do broker, banco e hardware.# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
