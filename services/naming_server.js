// Naming Service - gRPC server for service registration and discovery
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/naming.proto');
// Important: keepCase: true preserves original field names (service_name, endpoint)
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const namingProto = grpc.loadPackageDefinition(packageDefinition).naming;

// In-memory storage: serviceName -> array of endpoints
const registry = new Map();

function register(call, callback) {
  const { service_name, endpoint } = call.request;
  console.log(`[Naming] Received register request: service_name="${service_name}", endpoint="${endpoint}"`);
  if (!service_name || !endpoint) {
    callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'service_name and endpoint are required'
    });
    return;
  }
  if (!registry.has(service_name)) {
    registry.set(service_name, []);
  }
  const endpoints = registry.get(service_name);
  if (!endpoints.includes(endpoint)) {
    endpoints.push(endpoint);
  }
  console.log(`[Naming] Registered ${service_name} -> ${endpoint}`);
  callback(null, { success: true, message: 'Registered' });
}

function discover(call, callback) {
  const { service_name } = call.request;
  const endpoints = registry.get(service_name) || [];
  console.log(`[Naming] Discover ${service_name} -> ${endpoints}`);
  callback(null, { endpoints });
}

function main() {
  const server = new grpc.Server();
  server.addService(namingProto.NamingService.service, { register, discover });
  const port = '0.0.0.0:50055';
  server.bindAsync(port, grpc.ServerCredentials.createInsecure(), (err, bindPort) => {
    if (err) {
      console.error('Failed to bind naming server', err);
      return;
    }
    console.log(`Naming Service running on ${port}`);
    server.start();
  });
}

main();