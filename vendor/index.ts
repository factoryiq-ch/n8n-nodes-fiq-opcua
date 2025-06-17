// Selective OPC UA vendor index
// Contains only essential client functionality

// All exports from node-opcua-client which includes most of what we need
export {
  OPCUAClient,
  SecurityPolicy,
  StatusCodes,
  ClientSession
} from './node-opcua-client/dist';

// AttributeIds from node-opcua-data-model
export { AttributeIds } from './node-opcua-data-model/dist';

// Types from node-opcua-types for specific enums
export { UserTokenType, MessageSecurityMode } from './node-opcua-types/dist';

// DataType from node-opcua-variant
export { DataType } from './node-opcua-variant/dist';

// Additional client exports
export * from './node-opcua-client/dist';
