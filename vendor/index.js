/**
 * Vendor Directory - Node-OPCUA 2.156.0 Components
 *
 * This file provides a centralized export point for all OPC UA components
 * needed by the FactoryIQ OPC UA node implementation.
 *
 * Re-exports from the compiled node-opcua distribution.
 */

// Import everything from the compiled node-opcua
const nodeOpcua = require('./node-opcua');

// Re-export specific components we need
module.exports = {
  OPCUAClient: nodeOpcua.OPCUAClient,
  SecurityPolicy: nodeOpcua.SecurityPolicy,
  MessageSecurityMode: nodeOpcua.MessageSecurityMode,
  UserTokenType: nodeOpcua.UserTokenType,
  AttributeIds: nodeOpcua.AttributeIds,
  DataType: nodeOpcua.DataType,
};
