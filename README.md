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

A API expõe `GET /status`, `POST /irrigation`, `GET/POST /harvest` e `PUT /harvest/:id/reserve`. A camada MQTT está representada pelos tópicos definidos no `.env`; o próximo passo de integração é conectar o listener MQTT e persistir telemetria em MongoDB.

## Arquitetura evolutiva

- `src/`: aplicação React + TypeScript do painel web administrativo.
- `backend/`: API Express com contratos compatíveis com o fluxo sensor -> backend -> app -> atuador.
- `iot/`: reservado para o firmware ESP32 com DHT22, sensor de solo, relé e MQTT.

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
