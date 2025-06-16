/**
 * Vendor Directory - Minimal OPC UA Client Implementation
 *
 * This file provides a minimal, self-contained OPC UA client implementation
 * for the FactoryIQ OPC UA node, avoiding external dependencies.
 */

// Import the external node-opcua package from node_modules
const opcua = require('node-opcua');

// Re-export only what we need for the node implementation
module.exports = {
  OPCUAClient: opcua.OPCUAClient,
  SecurityPolicy: opcua.SecurityPolicy,
  MessageSecurityMode: opcua.MessageSecurityMode,
  UserTokenType: opcua.UserTokenType,
  AttributeIds: opcua.AttributeIds,
  DataType: opcua.DataType,
};
