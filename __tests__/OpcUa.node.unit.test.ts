import { FactoryiqOpcUa } from "../nodes/FactoryIQ/OpcUa";
import { OpcUaConnectionPool } from "../nodes/FactoryIQ/OpcUa/ConnectionPool";
import type { IExecuteFunctions } from "n8n-workflow";

jest.mock('../vendor', () => ({
  OPCUAClient: {
    create: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        readVariableValue: jest.fn().mockResolvedValue([
          { statusCode: { name: 'Good' }, value: { value: 42, dataType: 'Double' } },
        ]),
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: 'Good' }, value: { value: 42, dataType: 'Double' } },
        ]),
        write: jest.fn().mockResolvedValue([{ name: 'Good' }]),
        call: jest.fn().mockResolvedValue([
          { statusCode: { name: 'Good' }, outputArguments: [{ value: 'Hello' }] },
        ]),
        close: jest.fn().mockResolvedValue(undefined),
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: false,
      }),
    })),
  },
  SecurityPolicy: { None: 'None' },
  MessageSecurityMode: { None: 'None' },
  UserTokenType: { UserName: 'UserName', Certificate: 'Certificate' },
  DataType: { Double: 'Double', String: 'String' },
  AttributeIds: { Value: 13 },
}));

function createMockContext(params: Record<string, any>, credentials: any): IExecuteFunctions {
  const isWriter = params.operation === 'write';
  return {
    getNodeParameter: (name: string, itemIndex: number, fallback?: any) => {
      if (params[name] !== undefined) return params[name];
      if (name === 'writeOperation' && isWriter) return params.writeOperation || 'writeVariable';
      if (name === 'operation') return params.operation;
      if (name === 'nodeIds' && params.operation === 'read') return params.nodeIds || [];
      return fallback;
    },
    getCredentials: async (name: string) => credentials,
    getInputData: () => isWriter ? [{}] : [],
    getNode: () => ({} as any),
  } as unknown as IExecuteFunctions;
}

// Helper to set the default node-opcua mock for all session methods
function setDefaultNodeOpcuaMock() {
  jest.resetModules();
  jest.doMock('../vendor', () => ({
    OPCUAClient: {
      create: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          readVariableValue: jest.fn().mockResolvedValue([
            { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
          ]),
          read: jest.fn().mockResolvedValue([
            { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
          ]),
          write: jest.fn().mockResolvedValue([{ name: "Good" }]),
          call: jest.fn().mockResolvedValue([{ statusCode: { name: "Good" }, outputArguments: [{ value: "Hello" }] }]),
          close: jest.fn().mockResolvedValue(undefined),
        }),
      })),
    },
    SecurityPolicy: { None: "None", Basic128Rsa15: "Basic128Rsa15", Basic256: "Basic256", Basic256Sha256: "Basic256Sha256", Aes128_Sha256_RsaOaep: "Aes128_Sha256_RsaOaep", Aes256_Sha256_RsaPss: "Aes256_Sha256_RsaPss" },
    MessageSecurityMode: { None: "None", Sign: "Sign", SignAndEncrypt: "SignAndEncrypt" },
    UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
    DataType: { Double: "Double", String: "String", Boolean: "Boolean", SByte: "SByte", Byte: "Byte", Int16: "Int16", UInt16: "UInt16", Int32: "Int32", UInt32: "UInt32", Int64: "Int64", UInt64: "UInt64", Float: "Float", DateTime: "DateTime", Guid: "Guid", ByteString: "ByteString" },
    AttributeIds: { Value: 13 },
  }));
}

// Set the default mock before all tests
setDefaultNodeOpcuaMock();

describe("FactoryIQ OpcUA Node (unit, with mocks)", () => {
  beforeEach(() => {
    setDefaultNodeOpcuaMock();
  });

  it("returns correct output in Reader mode", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);

    const result = await node.execute.call(context);
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=TestVariable"]).toBe(42);
    expect(result[0][0].json.status).toBe("Good");
  });

  it("returns correct output in Writer mode (writeVariable)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "123.45",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=WritableVariable"]).toBe(123.45);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("returns correct output in Writer mode (callMethod)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: {},
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);

    const result = await node.execute.call(context);
    expect(((result[0][0].json.metrics ?? {}) as any).outputArguments[0].value).toBe("Hello");
    expect(result[0][0].json.status).toBe("ok");
  });

  it("handles errors gracefully", async () => {
    // Reset modules to ensure clean mock state
    jest.resetModules();
    // Override the mock to throw on connect
    jest.doMock('../vendor', () => ({
      OPCUAClient: {
        create: jest.fn(() => ({
          connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
          disconnect: jest.fn().mockResolvedValue(undefined),
        })),
      },
      SecurityPolicy: { None: "None", Basic128Rsa15: "Basic128Rsa15", Basic256: "Basic256", Basic256Sha256: "Basic256Sha256", Aes128_Sha256_RsaOaep: "Aes128_Sha256_RsaOaep", Aes256_Sha256_RsaPss: "Aes256_Sha256_RsaPss" },
      MessageSecurityMode: { None: "None", Sign: "Sign", SignAndEncrypt: "SignAndEncrypt" },
      UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
      DataType: { Double: "Double", String: "String", Boolean: "Boolean", SByte: "SByte", Byte: "Byte", Int16: "Int16", UInt16: "UInt16", Int32: "Int32", UInt32: "UInt32", Int64: "Int64", UInt64: "UInt64", Float: "Float", DateTime: "DateTime", Guid: "Guid", ByteString: "ByteString" },
      AttributeIds: { Value: 13 },
    }));

    // Re-import the module with new mock
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);

    await expect(node.execute.call(context)).rejects.toThrow("Failed to connect or authenticate to OPC UA server.");
  });

  it("throws if credentials are missing", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const context = createMockContext(params, null);
    await expect(node.execute.call(context)).rejects.toThrow("No OPC UA credentials provided.");
  });

  it("throws on invalid mode", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "invalidMode",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Invalid operation selected.");
  });

  it("throws on invalid operation in writer mode", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "notARealOperation",
      nodeId: "ns=1;s=WritableVariable",
      value: "123.45",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Unsupported operation type.");
  });

  it("throws on reader mode with empty nodeIds", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: [],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("At least one Node ID must be provided for reading.");
  });

  it("throws in writer mode with missing nodeId or dataType", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "",
      value: "",
      dataType: "",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Node ID and Data Type are required for variable write.");
  });

  it("throws in x509 auth if certificate or privateKey is missing (reader)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
      authenticationType: "x509",
      certificate: "",
      privateKey: "",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      certificate: "",
      privateKey: "",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("throws in x509 auth if certificate or privateKey is missing (writer)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
      authenticationType: "x509",
      certificate: "",
      privateKey: "",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      certificate: "",
      privateKey: "",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("covers all security policy and mode switches", async () => {
    setDefaultNodeOpcuaMock();
    const policies = [
      "None", "Basic128Rsa15", "Basic256", "Basic256Sha256", "Aes128_Sha256_RsaOaep", "Aes256_Sha256_RsaPss"
    ];
    const modes = ["None", "Sign", "SignAndEncrypt"];
    for (const policy of policies) {
      for (const mode of modes) {
        setDefaultNodeOpcuaMock();
        const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
        const node = new FactoryiqOpcUa();
        const params = {
          operation: "read",
          nodeIds: ["ns=1;s=TestVariable"],
        };
        const credentials = {
          endpointUrl: "opc.tcp://localhost:4840",
          securityPolicy: policy,
          securityMode: mode,
          authenticationType: "anonymous",
        };
        const context = createMockContext(params, credentials);
        await expect(node.execute.call(context)).resolves.toBeDefined();
      }
    }
  });

  it("covers default/fallback in security policy and mode switches", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "UnknownPolicy",
      securityMode: "UnknownMode",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).resolves.toBeDefined();
  });

  it("handles error in session.close() and client.disconnect() (reader)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in close/disconnect
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockRejectedValue(new Error("disconnect error")),
      createSession: jest.fn().mockResolvedValue({
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
        ]),
        close: jest.fn().mockRejectedValue(new Error("close error")),
      }),
    }));
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).resolves.toBeDefined();
  });

  it("handles error in both session.close() and client.disconnect() (writer)", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in close/disconnect
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockRejectedValue(new Error("disconnect error")),
      createSession: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
        ]),
        close: jest.fn().mockRejectedValue(new Error("close error")),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("handles error thrown in session.write (writer mode)", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in write
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        write: jest.fn().mockRejectedValue(new Error("write error")),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Failed to execute operation on OPC UA node.");
  });

  it("handles error thrown in session.call (writer mode)", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: {},
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in call
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        call: jest.fn().mockRejectedValue(new Error("call error")),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Failed to execute operation on OPC UA node.");
  });

  it("writer: callMethod with arguments", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: { arguments: [{ dataType: "String", value: "foo" }] },
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(((result[0][0].json.metrics ?? {}) as any).outputArguments[0].value).toBe("Hello");
    expect(result[0][0].json.status).toBe("ok");
  });

  it("reader: bad status code", async () => {
    // Reset modules and set up mock for bad status code
    jest.resetModules();
    jest.doMock('../vendor', () => ({
      OPCUAClient: {
        create: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          createSession: jest.fn().mockResolvedValue({
            read: jest.fn().mockResolvedValue([
              { statusCode: { name: "BadNodeIdUnknown" }, value: { value: null, dataType: "Double" } }
            ]),
            close: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      },
      SecurityPolicy: { None: "None", Basic128Rsa15: "Basic128Rsa15", Basic256: "Basic256", Basic256Sha256: "Basic256Sha256", Aes128_Sha256_RsaOaep: "Aes128_Sha256_RsaOaep", Aes256_Sha256_RsaPss: "Aes256_Sha256_RsaPss" },
      MessageSecurityMode: { None: "None", Sign: "Sign", SignAndEncrypt: "SignAndEncrypt" },
      UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
      DataType: { Double: "Double", String: "String", Boolean: "Boolean", SByte: "SByte", Byte: "Byte", Int16: "Int16", UInt16: "UInt16", Int32: "Int32", UInt32: "UInt32", Int64: "Int64", UInt64: "UInt64", Float: "Float", DateTime: "DateTime", Guid: "Guid", ByteString: "ByteString" },
      AttributeIds: { Value: 13 },
    }));

    // Re-import the module with new mock
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=BadNode"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("BadNodeIdUnknown");
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=BadNode"]).toBeNull();
  });

  it("writer: writeVariable with all supported data types", async () => {
    setDefaultNodeOpcuaMock();
    const dataTypes = [
      "Boolean", "SByte", "Byte", "Int16", "UInt16", "Int32", "UInt32", "Int64", "UInt64", "Float", "Double", "String", "DateTime", "Guid", "ByteString"
    ];
    for (const dataType of dataTypes) {
      setDefaultNodeOpcuaMock();
      const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=WritableVariable",
        value: dataType === "Boolean" ? "true" : dataType === "String" ? "test" : "1",
        dataType,
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);
      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
    }
  });

  it("writer: writeVariable with unknown dataType (default branch)", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "foobar",
      dataType: "UnknownType",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
    const meta = (result[0][0].json.meta ?? {}) as Record<string, any>;
    expect(meta.dataType).toBe(null);
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=WritableVariable"]).toBe("foobar");
  });

  it("writer: writeVariable with DateTime and invalid date string", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "not-a-date",
      dataType: "DateTime",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=WritableVariable"]).toBeInstanceOf(Date);
    expect(isNaN(metrics["ns=1;s=WritableVariable"]).valueOf()).toBe(true); // Invalid Date
  });

  it("writer: writeVariable with ByteString and non-binary string", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "not-binary",
      dataType: "ByteString",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(Buffer.isBuffer(metrics["ns=1;s=WritableVariable"])).toBe(true);
  });

  it("reader: result.value is undefined (should return null for metrics and meta.dataType)", async () => {
    // Reset modules and set up mock for undefined result.value
    jest.resetModules();
    jest.doMock('../vendor', () => ({
      OPCUAClient: {
        create: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          createSession: jest.fn().mockResolvedValue({
            read: jest.fn().mockResolvedValue([
              { statusCode: { name: "Good" }, value: undefined }
            ]),
            close: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      },
      SecurityPolicy: { None: "None", Basic128Rsa15: "Basic128Rsa15", Basic256: "Basic256", Basic256Sha256: "Basic256Sha256", Aes128_Sha256_RsaOaep: "Aes128_Sha256_RsaOaep", Aes256_Sha256_RsaPss: "Aes256_Sha256_RsaPss" },
      MessageSecurityMode: { None: "None", Sign: "Sign", SignAndEncrypt: "SignAndEncrypt" },
      UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
      DataType: { Double: "Double", String: "String", Boolean: "Boolean", SByte: "SByte", Byte: "Byte", Int16: "Int16", UInt16: "UInt16", Int32: "Int32", UInt32: "UInt32", Int64: "Int64", UInt64: "UInt64", Float: "Float", DateTime: "DateTime", Guid: "Guid", ByteString: "ByteString" },
      AttributeIds: { Value: 13 },
    }));

    // Re-import the module with new mock
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    const json = result[0][0].json as import("n8n-workflow").IDataObject;
    const metrics = json.metrics as import("n8n-workflow").IDataObject;
    expect(metrics["ns=1;s=TestVariable"]).toBeNull();
    const meta = json.meta as import("n8n-workflow").IDataObject;
    expect(meta.dataType).toBeNull();
  });

  it("returns correct output for multiple nodeIds in Reader mode", async () => {
    // Reset modules and set up mock for multiple node reads
    jest.resetModules();
    jest.doMock('../vendor', () => ({
      OPCUAClient: {
        create: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          createSession: jest.fn().mockResolvedValue({
            read: jest.fn().mockResolvedValue([
              { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } },
              { statusCode: { name: "Good" }, value: { value: 99, dataType: "Double" } },
            ]),
            close: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      },
      SecurityPolicy: { None: "None", Basic128Rsa15: "Basic128Rsa15", Basic256: "Basic256", Basic256Sha256: "Basic256Sha256", Aes128_Sha256_RsaOaep: "Aes128_Sha256_RsaOaep", Aes256_Sha256_RsaPss: "Aes256_Sha256_RsaPss" },
      MessageSecurityMode: { None: "None", Sign: "Sign", SignAndEncrypt: "SignAndEncrypt" },
      UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
      DataType: { Double: "Double", String: "String", Boolean: "Boolean", SByte: "SByte", Byte: "Byte", Int16: "Int16", UInt16: "UInt16", Int32: "Int32", UInt32: "UInt32", Int64: "Int64", UInt64: "UInt64", Float: "Float", DateTime: "DateTime", Guid: "Guid", ByteString: "ByteString" },
      AttributeIds: { Value: 13 },
    }));

    // Re-import the module with new mock
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable1", "ns=1;s=TestVariable2"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    const metrics0 = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    const metrics1 = (result[0][1].json.metrics ?? {}) as Record<string, any>;
    expect(metrics0["ns=1;s=TestVariable1"]).toBe(42);
    expect(metrics1["ns=1;s=TestVariable2"]).toBe(99);
    expect(result[0][0].json.status).toBe("Good");
    expect(result[0][1].json.status).toBe("Good");
  });

  it("returns correct output for multiple items in Writer mode (writeVariable)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "123.45",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch getInputData to return two items
    const context = {
      ...createMockContext(params, credentials),
      getInputData: () => [{ json: {} }, { json: {} }], // Two items with proper structure
      getNodeParameter: (name: string, itemIndex: number) => {
        if (name === "nodeId") return itemIndex === 0 ? "ns=1;s=WritableVariable1" : "ns=1;s=WritableVariable2";
        if (name === "value") return itemIndex === 0 ? "123.45" : "678.90";
        if (name === "dataType") return "Double";
        if (name === "writeOperation") return "writeVariable";
        if (name === "operation") return "write";
        return "";
      },
    } as unknown as import("n8n-workflow").IExecuteFunctions;
    // Patch the mock to always return Good
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const result = await node.execute.call(context);
    const metrics0 = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    const metrics1 = (result[0][1].json.metrics ?? {}) as Record<string, any>;
    expect(metrics0["ns=1;s=WritableVariable1"]).toBe(123.45);
    expect(metrics1["ns=1;s=WritableVariable2"]).toBe(678.90);
    expect(result[0][0].json.status).toBe("ok");
    expect(result[0][1].json.status).toBe("ok");
  });

  it("writer: callMethod with parametersRaw as non-object", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: "not-an-object",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("writer: callMethod with parametersRaw as object but missing arguments", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: {},
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("writer: callMethod with arguments not array", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: { arguments: "not-an-array" },
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("writer: callMethod with arguments as empty array", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      methodNodeId: "ns=1;s=TestMethod",
      parameters: { arguments: [] },
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("writer: callMethod with missing objectNodeId", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      // objectNodeId missing
      methodNodeId: "ns=1;s=TestMethod",
      parameters: {},
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).resolves.toBeDefined();
  });

  it("writer: callMethod with missing methodNodeId", async () => {
    setDefaultNodeOpcuaMock();
    const { FactoryiqOpcUa } = require("../nodes/FactoryIQ/OpcUa");
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "callMethod",
      objectNodeId: "ns=1;s=Objects",
      // methodNodeId missing
      parameters: {},
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).resolves.toBeDefined();
  });

  it("read: x509 with only certificate", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      certificate: "dummy-cert",
      // privateKey missing
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("read: x509 with only privateKey", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      // certificate missing
      privateKey: "dummy-key",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("write: x509 with only certificate", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      certificate: "dummy-cert",
      // privateKey missing
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("write: x509 with only privateKey", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      // certificate missing
      privateKey: "dummy-key",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("read: error in both session.close() and client.disconnect() in finally block", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in close/disconnect
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockRejectedValue(new Error("disconnect error")),
      createSession: jest.fn().mockResolvedValue({
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
        ]),
        close: jest.fn().mockRejectedValue(new Error("close error")),
      }),
    }));
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).resolves.toBeDefined();
  });

  it("write: error in both session.close() and client.disconnect() in finally block", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in close/disconnect
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockRejectedValue(new Error("disconnect error")),
      createSession: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        close: jest.fn().mockRejectedValue(new Error("close error")),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("read: result.statusCode is falsy", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to return result with no statusCode
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        read: jest.fn().mockResolvedValue([
          { value: { value: 42, dataType: "Double" } }
        ]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("Good");
    const metrics = (result[0][0].json.metrics ?? {}) as Record<string, any>;
    expect(metrics["ns=1;s=TestVariable"]).toBe(42);
  });

  it("read: result.value.dataType is a string (not a number)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to return result.value.dataType as string
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: "not-a-number" } }
        ]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    const meta = (result[0][0].json.meta ?? {}) as Record<string, any>;
    expect(meta.dataType).toBeNull();
  });

  it("read: result.value.dataType is unknown number (not in map)", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to return result.value.dataType as unknown number
    const nodeOpcua = require('../vendor');
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        read: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: 9999 } }
        ]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    const meta = (result[0][0].json.meta ?? {}) as Record<string, any>;
    expect(meta.dataType).toBeNull();
  });

  describe("Connection Pool Integration", () => {
    beforeEach(() => {
      // Reset the singleton instance before each test
      (OpcUaConnectionPool as any).instance = undefined;
      setDefaultNodeOpcuaMock();
    });

    it("should use connection pool for read operations", async () => {
      const poolSpy = jest.spyOn(OpcUaConnectionPool, 'getInstance');
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      await node.execute.call(context);

      expect(poolSpy).toHaveBeenCalled();
    });

    it("should use connection pool for write operations", async () => {
      const poolSpy = jest.spyOn(OpcUaConnectionPool, 'getInstance');
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=WritableVariable",
        value: "123.45",
        dataType: "Double",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      await node.execute.call(context);

      expect(poolSpy).toHaveBeenCalled();
    });

    it("should reuse connections across multiple executions", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // First execution
      await node.execute.call(context);

      // Get the pool instance and check it has connections
      const pool = OpcUaConnectionPool.getInstance();
      const poolState = (pool as any).pools;
      expect(poolState.size).toBe(1);

      // Second execution should reuse the connection
      await node.execute.call(context);

      // Should still have the same connection
      expect(poolState.size).toBe(1);
    });

    it("should create separate pools for different credentials", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials1 = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const credentials2 = {
        endpointUrl: "opc.tcp://localhost:4841",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context1 = createMockContext(params, credentials1);
      const context2 = createMockContext(params, credentials2);

      // Execute with first credentials
      await node.execute.call(context1);

      // Execute with second credentials
      await node.execute.call(context2);

      // Should have separate pools for different endpoints
      const pool = OpcUaConnectionPool.getInstance();
      const poolState = (pool as any).pools;
      expect(poolState.size).toBe(2);
    });

    it("should handle pool failures gracefully by falling back", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Mock pool to throw error
      const poolMock = {
        getConnection: jest.fn().mockRejectedValue(new Error("Pool failed")),
        releaseConnection: jest.fn(),
      };
      jest.spyOn(OpcUaConnectionPool, 'getInstance').mockReturnValue(poolMock as any);

      // Should throw error wrapped by NodeOperationError
      await expect(node.execute.call(context)).rejects.toThrow("Failed to connect or authenticate to OPC UA server");
    });

    it("should release connections back to pool after successful operations", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      const releaseConnectionSpy = jest.fn();
      const poolMock = {
        getConnection: jest.fn().mockResolvedValue({
          client: {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
          },
          session: {
            read: jest.fn().mockResolvedValue([
              { statusCode: { name: 'Good' }, value: { value: 42, dataType: 'Double' } },
            ]),
            close: jest.fn().mockResolvedValue(undefined),
            isChannelValid: jest.fn().mockReturnValue(true),
            isReconnecting: false,
          },
          inUse: true,
          key: "test-key"
        }),
        releaseConnection: releaseConnectionSpy,
      };
      jest.spyOn(OpcUaConnectionPool, 'getInstance').mockReturnValue(poolMock as any);

      await node.execute.call(context);

      expect(releaseConnectionSpy).toHaveBeenCalled();
    });

    it("should release connections back to pool after failed operations", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: ["ns=1;s=TestVariable"],
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      const releaseConnectionSpy = jest.fn();
      const poolMock = {
        getConnection: jest.fn().mockResolvedValue({
          client: {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
          },
          session: {
            read: jest.fn().mockRejectedValue(new Error("Read failed")),
            close: jest.fn().mockResolvedValue(undefined),
            isChannelValid: jest.fn().mockReturnValue(true),
            isReconnecting: false,
          },
          inUse: true,
          key: "test-key"
        }),
        releaseConnection: releaseConnectionSpy,
      };
      jest.spyOn(OpcUaConnectionPool, 'getInstance').mockReturnValue(poolMock as any);

      await expect(node.execute.call(context)).rejects.toThrow("Failed to read node values");

      // Should still release connection even after error
      expect(releaseConnectionSpy).toHaveBeenCalled();
    });
  });

});

// Additional tests for branch coverage
describe("FactoryIQ OpcUA Node - Branch Coverage", () => {
  beforeEach(() => {
    setDefaultNodeOpcuaMock();
  });

  it("should handle empty nodeIds array", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: [],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("At least one Node ID must be provided for reading.");
  });

  it("should handle missing nodeId in write operation", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "",
      dataType: "Double",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Node ID and Data Type are required for variable write.");
  });

  it("should handle missing dataType in write operation", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "write",
      writeOperation: "writeVariable",
      nodeId: "ns=1;s=TestVariable",
      dataType: "",
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Node ID and Data Type are required for variable write.");
  });

  it("should test getDataTypeEnum with default case", () => {
    // Access private static method for testing
    const getDataTypeEnum = (FactoryiqOpcUa as any).getDataTypeEnum;
    expect(getDataTypeEnum('UnknownType')).toBe('String'); // Should return default
  });

  it("should test convertValueToDataType Boolean conversions", () => {
    const convertValueToDataType = (FactoryiqOpcUa as any).convertValueToDataType;

    // Test true cases
    expect(convertValueToDataType('true', 'Boolean')).toBe(true);
    expect(convertValueToDataType('1', 'Boolean')).toBe(true);
    expect(convertValueToDataType('on', 'Boolean')).toBe(true);
    expect(convertValueToDataType('yes', 'Boolean')).toBe(true);

    // Test false cases
    expect(convertValueToDataType('false', 'Boolean')).toBe(false);
    expect(convertValueToDataType('0', 'Boolean')).toBe(false);
    expect(convertValueToDataType('random', 'Boolean')).toBe(false);
  });

  it("should test convertValueToDataType numeric clamping", () => {
    const convertValueToDataType = (FactoryiqOpcUa as any).convertValueToDataType;

    // Test SByte clamping
    expect(convertValueToDataType('200', 'SByte')).toBe(127); // Clamped to max
    expect(convertValueToDataType('-200', 'SByte')).toBe(-128); // Clamped to min

    // Test Byte clamping
    expect(convertValueToDataType('300', 'Byte')).toBe(255); // Clamped to max
    expect(convertValueToDataType('-10', 'Byte')).toBe(0); // Clamped to min

    // Test with invalid numbers
    expect(convertValueToDataType('abc', 'Int32')).toBe(0);
    expect(convertValueToDataType('abc', 'Float')).toBe(0.0);
  });

  it("should test convertValueToDataType special types", () => {
    const convertValueToDataType = (FactoryiqOpcUa as any).convertValueToDataType;

    // Test DateTime
    const dateValue = convertValueToDataType('2023-01-01', 'DateTime');
    expect(dateValue).toBeInstanceOf(Date);

    // Test ByteString
    const bufferValue = convertValueToDataType('test', 'ByteString');
    expect(Buffer.isBuffer(bufferValue)).toBe(true);

    // Test default case
    expect(convertValueToDataType('test', 'UnknownType')).toBe('test');
  });

  it("should handle x509 authentication without certificate", async () => {
    const node = new FactoryiqOpcUa();
    const params = {
      operation: "read",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "x509",
      // Missing certificate and privateKey
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
  });

  it("should test opcuaDataTypeMap coverage", () => {
    // Access the private static property
    const opcuaDataTypeMap = (FactoryiqOpcUa as any).opcuaDataTypeMap;

    // Test known mappings
    expect(opcuaDataTypeMap[1]).toBe('Boolean');
    expect(opcuaDataTypeMap[12]).toBe('String');
    expect(opcuaDataTypeMap[11]).toBe('Double');

    // Test unmapped number
    expect(opcuaDataTypeMap[999]).toBeUndefined();
  });
});
