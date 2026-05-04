// Solar Panel Service - server streaming and unary RPC

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// const namingClient = require('./naming_client_helper');

// Load solar proto with keepCase to preserve field names
const PROTO_PATH = path.join(__dirname, '../proto/solar.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const solarProto = grpc.loadPackageDefinition(packageDefinition).solar;

let currentWatts = 1000; // starting value

// Generate random power between 0 and 5000 Watts
function updatePower() {
  currentWatts = Math.random() * 5000;
}
setInterval(updatePower, 1000); // update every second

// Unary RPC: GetCurrentPower
function getCurrentPower(call, callback) {
  const userId = call.metadata.get('user-id')[0];
  console.log(`[Solar] GetCurrentPower called by user: ${userId || 'anonymous'}`);
  callback(null, { watts: currentWatts });
}

// Server streaming RPC: StreamPower
function streamPower(call) {
  console.log('[Solar] StreamPower started');
  const intervalId = setInterval(() => {
    const sample = {
      timestamp_sec: Math.floor(Date.now() / 1000),
      watts: currentWatts
    };
    call.write(sample);
  }, 2000);

  call.on('cancelled', () => {
    console.log('[Solar] StreamPower cancelled by client');
    clearInterval(intervalId);
  });
}

async function registerWithNaming() {
  const namingAddr = 'localhost:50055';
  const namingProtoPath = path.join(__dirname, '../proto/naming.proto');
  // Keep case to preserve service_name and endpoint fields
  const namingPackageDef = protoLoader.loadSync(namingProtoPath, { keepCase: true });
  const namingDef = grpc.loadPackageDefinition(namingPackageDef).naming;
  const client = new namingDef.NamingService(namingAddr, grpc.credentials.createInsecure());

  const request = {
    service_name: 'SolarPanel',
    endpoint: 'localhost:50051'
  };
  console.log('[Solar] Sending register request:', JSON.stringify(request));

  return new Promise((resolve, reject) => {
    client.register(request, (err, response) => {
      if (err) {
        console.error('[Solar] Registration error:', err.message);
        reject(err);
      } else {
        console.log('[Solar] SolarPanel registered successfully');
        resolve(response);
      }
    });
  });
}

function main() {
  const server = new grpc.Server();
  server.addService(solarProto.SolarPanel.service, {
    GetCurrentPower: getCurrentPower,
    StreamPower: streamPower
  });
  const port = '0.0.0.0:50051';
  server.bindAsync(port, grpc.ServerCredentials.createInsecure(), async (err, bindPort) => {
    if (err) {
      console.error('Failed to bind SolarPanel', err);
      return;
    }
    console.log(`Solar Panel Service running on ${port}`);
    server.start();
    await registerWithNaming();
  });
}

main();