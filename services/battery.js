const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/battery.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const batteryProto = grpc.loadPackageDefinition(packageDefinition).battery;

let chargePercent = 50.0;
let currentPower = 0.0;
let mode = "IDLE";
function manageBattery(call) {
  console.log('[Battery] Stream started');
  call.on('data', (command) => {
    console.log('[Battery] Received command type:', command.type, 'power_w:', command.power_w);
    
    // Обновляем состояние в зависимости от команды
    switch (command.type) {
      case 0: // CHARGE
        chargePercent = Math.min(100, chargePercent + 5);
        currentPower = command.power_w;
        mode = "CHARGING";
        console.log(`[Battery] CHARGING -> ${chargePercent}%`);
        break;
      case 1: // DISCHARGE
        chargePercent = Math.max(0, chargePercent - 5);
        currentPower = -command.power_w;
        mode = "DISCHARGING";
        console.log(`[Battery] DISCHARGING -> ${chargePercent}%`);
        break;
      case 2: // GET_STATUS
        // ничего не меняем
        console.log('[Battery] GET_STATUS');
        break;
      default:
        console.log('[Battery] Unknown command type:', command.type);
    }
    
    const status = {
      charge_percent: chargePercent,
      current_power_w: currentPower,
      mode: mode
    };
    call.write(status);
  });
  call.on('end', () => {
    console.log('[Battery] Client ended stream');
    call.end();
  });
  call.on('cancelled', () => {
    console.log('[Battery] Stream cancelled');
  });
}

// Registration
const { getNamingClient } = require('./naming_client_helper');
async function registerWithNaming() {
  const namingAddr = 'localhost:50055';
  const client = getNamingClient(namingAddr);
  const request = { service_name: 'BatteryStorage', endpoint: 'localhost:50053' };
  return new Promise((resolve, reject) => {
    client.register(request, (err, resp) => {
      if (err) reject(err);
      else resolve(resp);
    });
  });
}

function main() {
  const server = new grpc.Server();
  server.addService(batteryProto.BatteryStorage.service, { ManageBattery: manageBattery });
  const port = '0.0.0.0:50053';
  server.bindAsync(port, grpc.ServerCredentials.createInsecure(), async (err) => {
    if (err) throw err;
    console.log(`Battery Service running on ${port}`);
    server.start();
    await registerWithNaming();
    console.log('Battery registered');
  });
}
main();