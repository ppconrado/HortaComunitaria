import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import mqtt from 'mqtt';
import { Telemetry } from './models/Telemetry.js';

const app = express();
const port = process.env.PORT || 3000;
let irrigation = {
  active: false,
  mode: 'automatic',
  updatedAt: new Date().toISOString(),
};
let latestTelemetry = {
  soilMoisture: 42,
  temperature: 26,
  humidity: 68,
  timestamp: new Date().toISOString(),
};
const telemetryHistory = [latestTelemetry];
const harvests = [
  {
    id: 'harvest-1',
    crop: 'Alface crespa',
    harvestDate: '2026-09-26T16:00:00.000Z',
    available: true,
    quantity: 24,
  },
  {
    id: 'harvest-2',
    crop: 'Cebolinha',
    harvestDate: '2026-09-27T08:30:00.000Z',
    available: true,
    quantity: 18,
  },
];

app.use(cors());
app.use(express.json());
app.get('/health', (_request, response) =>
  response.json({ ok: true, service: 'horta-comunitaria-api' }),
);
app.get('/status', (_request, response) =>
  response.json({ ...latestTelemetry, irrigation }),
);
app.get('/telemetry/history', (_request, response) =>
  response.json(telemetryHistory.slice(-100).reverse()),
);
app.post('/irrigation', (request, response) => {
  const { action, mode = 'manual' } = request.body;
  if (!['on', 'off'].includes(action))
    return response
      .status(400)
      .json({ error: 'Ação inválida. Use on ou off.' });
  irrigation = {
    active: action === 'on',
    mode,
    updatedAt: new Date().toISOString(),
  };
  const client = app.locals.mqtt;
  if (client) {
    const topic = process.env.MQTT_IRRIGATION_TOPIC || 'horta/irrigation';
    client.publish(topic, JSON.stringify({ command: action }), (error) => {
      if (error)
        return response
          .status(502)
          .json({ error: 'Falha ao publicar no MQTT' });
      response.json({ message: `Irrigação ${action}`, irrigation });
    });
    return;
  }
  response.json({ message: `Irrigação ${action}`, irrigation });
});
app.get('/harvest', (_request, response) => response.json(harvests));
app.post('/harvest', (request, response) => {
  const { crop, harvestDate, quantity = 0 } = request.body;
  if (!crop || !harvestDate)
    return response
      .status(400)
      .json({ error: 'crop e harvestDate são obrigatórios.' });
  const harvest = {
    id: `harvest-${harvests.length + 1}`,
    crop,
    harvestDate,
    quantity,
    available: true,
  };
  harvests.push(harvest);
  response.status(201).json(harvest);
});
app.put('/harvest/:id/reserve', (request, response) => {
  const harvest = harvests.find((item) => item.id === request.params.id);
  if (!harvest)
    return response.status(404).json({ error: 'Colheita não encontrada.' });
  if (!harvest.available)
    return response.status(409).json({ error: 'Colheita já reservada.' });
  harvest.available = false;
  harvest.reservedBy = request.body.reservedBy || 'Morador';
  response.json(harvest);
});

function connectIntegrations() {
  if (process.env.MONGO_URI) {
    mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 })
      .then(() => console.log('MongoDB conectado'))
      .catch(() => console.log('MongoDB indisponível; usando memória'));
  }

  if (process.env.MQTT_BROKER) {
    const client = mqtt.connect(process.env.MQTT_BROKER, {
      reconnectPeriod: 5000,
      connectTimeout: 2500,
    });
    client.on('connect', () => {
      console.log('MQTT conectado');
      client.subscribe(process.env.MQTT_TELEMETRY_TOPIC || 'horta/telemetry');
    });
    client.on('message', (_topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        latestTelemetry = {
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        telemetryHistory.push(latestTelemetry);
        if (mongoose.connection.readyState === 1) {
          Telemetry.create(latestTelemetry).catch(() =>
            console.error('Falha ao salvar telemetria'),
          );
        }
      } catch {
        console.error('Telemetria MQTT inválida');
      }
    });
    app.locals.mqtt = client;
  }
}

connectIntegrations();
app.listen(port, () =>
  console.log(`Horta Comunitária API disponível em http://localhost:${port}`),
);
