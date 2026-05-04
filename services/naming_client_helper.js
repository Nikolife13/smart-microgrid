// Helper to create naming service client

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/naming.proto');
// Add keepCase true to preserve original field names (service_name, endpoint)
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const namingProto = grpc.loadPackageDefinition(packageDefinition).naming;

function getNamingClient(namingAddr) {
  return new namingProto.NamingService(namingAddr, grpc.credentials.createInsecure());
}

module.exports = { getNamingClient };