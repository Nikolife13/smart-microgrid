// GUI Server - Express + gRPC clients (исправленная версия)
const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let solarClient, meterClient, batteryClient;

function getNamingClient(namingAddr) {
  const namingProtoPath = path.join(__dirname, '../proto/naming.proto');
  const def = protoLoader.loadSync(namingProtoPath, { keepCase: true });
  const namingProto = grpc.loadPackageDefinition(def).naming;
  return new namingProto.NamingService(namingAddr, grpc.credentials.createInsecure());
}

async function discoverService(serviceName) {
  const naming = getNamingClient('localhost:50055');
  return new Promise((resolve, reject) => {
    naming.discover({ service_name: serviceName }, (err, resp) => {
      if (err || !resp.endpoints || !resp.endpoints.length)
        reject(new Error(`Service ${serviceName} not found`));
      else resolve(resp.endpoints[0]);
    });
  });
}

async function initClients() {
  try {
    const [solarEp, meterEp, batteryEp] = await Promise.all([
      discoverService('SolarPanel'),
      discoverService('SmartMeter'),
      discoverService('BatteryStorage')
    ]);
    const solarDef = protoLoader.loadSync(path.join(__dirname, '../proto/solar.proto'), { keepCase: true });
    const solarProto = grpc.loadPackageDefinition(solarDef).solar;
    const meterDef = protoLoader.loadSync(path.join(__dirname, '../proto/smart_meter.proto'), { keepCase: true });
    const meterProto = grpc.loadPackageDefinition(meterDef).smartmeter;
    const batteryDef = protoLoader.loadSync(path.join(__dirname, '../proto/battery.proto'), { keepCase: true });
    const batteryProto = grpc.loadPackageDefinition(batteryDef).battery;

    solarClient = new solarProto.SolarPanel(solarEp, grpc.credentials.createInsecure());
    meterClient = new meterProto.SmartMeter(meterEp, grpc.credentials.createInsecure());
    batteryClient = new batteryProto.BatteryStorage(batteryEp, grpc.credentials.createInsecure());
    console.log('gRPC clients initialized');
  } catch (err) {
    console.error('Failed to initialize clients', err);
  }
}

app.get('/api/solar/current', (req, res) => {
  if (!solarClient) return res.status(503).json({ error: 'Solar unavailable' });
  const deadline = new Date(Date.now() + 5000);
  const metadata = new grpc.Metadata();
  metadata.set('user-id', req.headers['user-id'] || 'anonymous');
  solarClient.GetCurrentPower({}, metadata, { deadline }, (err, resp) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(resp);
  });
});

app.get('/api/solar/stream', (req, res) => {
  if (!solarClient) return res.status(503).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  const call = solarClient.StreamPower({});
  let closed = false;
  call.on('data', (sample) => {
    if (!closed) res.write(`data: ${JSON.stringify(sample)}\n\n`);
  });
  call.on('end', () => { if (!closed) res.end(); closed = true; });
  call.on('error', (err) => {
    if (!closed) res.end();
    closed = true;
  });
  req.on('close', () => {
    if (!closed) {
      closed = true;
      call.cancel();
      res.end();
    }
  });
});

app.post('/api/meter/submit', (req, res) => {
  if (!meterClient) return res.status(503).json({ error: 'Meter unavailable' });
  const readings = req.body.readings;
  if (!Array.isArray(readings)) return res.status(400).json({ error: 'readings array required' });
  const deadline = new Date(Date.now() + 10000);
  const call = meterClient.SubmitReadings({ deadline }, (err, summary) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log('[GUI] Summary from meter:', summary);
    res.json(summary);
  });
  readings.forEach(r => call.write(r));
  call.end();
});

app.post('/api/battery/command', (req, res) => {
  if (!batteryClient) return res.status(503).json({ error: 'Battery unavailable' });
  const { type, power_w } = req.body;
  console.log('[GUI] Sending battery command:', { type, power_w });
  const deadline = new Date(Date.now() + 5000);
  const call = batteryClient.ManageBattery({ deadline });
  let responded = false;

  call.on('data', (status) => {
    if (!responded) {
      responded = true;
      console.log('[GUI] Battery response:', status);
      call.cancel();
      res.json(status);
    }
  });
  call.on('error', (err) => {
    console.error('[GUI] Battery gRPC error:', err);
    if (!responded) {
      responded = true;
      res.status(500).json({ error: err.message });
    }
  });
  call.on('end', () => {
    if (!responded) {
      responded = true;
      console.error('[GUI] Battery stream ended without response');
      res.status(500).json({ error: 'No response from battery' });
    }
  });

  call.write({ type, power_w: power_w || 0 });
  // НЕ вызываем call.end() – оставляем стрим открытым для получения ответа
});

app.get('/api/battery/status', (req, res) => {
  if (!batteryClient) return res.status(503).json({ error: 'Battery unavailable' });
  const call = batteryClient.ManageBattery();
  let responded = false;

  call.on('data', (status) => {
    if (!responded) {
      responded = true;
      call.cancel();
      res.json(status);
    }
  });
  call.on('error', (err) => {
    if (!responded) {
      responded = true;
      res.status(500).json({ error: err.message });
    }
  });
  call.on('end', () => {
    if (!responded) {
      responded = true;
      res.status(500).json({ error: 'No response from battery' });
    }
  });

  call.write({ type: 2, power_w: 0 }); // GET_STATUS = 2
  
});

async function main() {
  await initClients();
  const PORT = 3000;
  app.listen(PORT, () => console.log(`GUI Server running on http://localhost:${PORT}`));
}
main();