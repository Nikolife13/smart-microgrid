// Smart Meter Service - client streaming RPC
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/smart_meter.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const smartMeterProto = grpc.loadPackageDefinition(packageDefinition).smartmeter;

function submitReadings(call, callback) {
  let readings = [];
  call.on('data', (reading) => {
    readings.push(reading);
  });
  call.on('end', () => {
    let totalEnergyWh = 0;
    let sumPower = 0;
    for (let r of readings) {
      totalEnergyWh += r.watts;
      sumPower += r.watts;
    }
    const avgPower = readings.length ? sumPower / readings.length : 0;
    const summary = {
      total_energy_wh: totalEnergyWh,
      avg_power_w: avgPower,
      readings_count: readings.length
    };
    console.log(`[SmartMeter] summary:`, summary);
    callback(null, summary);
  });
  call.on('error', (err) => callback(err));
}

//Registration in naming service (similar to Solar)
const { getNamingClient } = require('./naming_client_helper');
async function registerWithNaming() {
  const namingAddr = 'localhost:50055';
  const client = getNamingClient(namingAddr);
  const request = { service_name: 'SmartMeter', endpoint: 'localhost:50052' };
  return new Promise((resolve, reject) => {
    client.register(request, (err, resp) => {
      if (err) reject(err);
      else resolve(resp);
    });
  });
}

function main() {
  const server = new grpc.Server();
  server.addService(smartMeterProto.SmartMeter.service, { SubmitReadings: submitReadings });
  const port = '0.0.0.0:50052';
  server.bindAsync(port, grpc.ServerCredentials.createInsecure(), async (err) => {
    if (err) throw err;
    console.log(`Smart Meter Service running on ${port}`);
    server.start();
    await registerWithNaming();
    console.log('SmartMeter registered');
  });
}
main();