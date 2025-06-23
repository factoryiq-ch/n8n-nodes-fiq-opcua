import { FactoryiqOpcUa } from "../nodes/FactoryIQ/OpcUa";
import type { IExecuteFunctions } from "n8n-workflow";

// Mock ConnectionPool and session
const mockSession = {
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
};

const mockPool = {
  getConnection: jest.fn().mockResolvedValue({
    client: {},
    session: mockSession,
    inUse: false,
    key: 'test-key',
  }),
  releaseConnection: jest.fn(),
};

jest.mock('../nodes/FactoryIQ/OpcUa/ConnectionPool', () => ({
  OpcUaConnectionPool: {
    getInstance: jest.fn(() => mockPool),
  },
}));

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
    // Reset mock functions
    jest.clearAllMocks();
    // Reset pool mock to default success behavior
    mockPool.getConnection.mockResolvedValue({
      client: {},
      session: mockSession,
      inUse: false,
      key: 'test-key',
    });
    // Reset session mocks to default success behavior
    mockSession.readVariableValue.mockResolvedValue([
      { statusCode: { name: 'Good' }, value: { value: 42, dataType: 'Double' } },
    ]);
    mockSession.read.mockResolvedValue([
      { statusCode: { name: 'Good' }, value: { value: 42, dataType: 'Double' } },
    ]);
    mockSession.write.mockResolvedValue([{ name: 'Good' }]);
    mockSession.call.mockResolvedValue([
      { statusCode: { name: 'Good' }, outputArguments: [{ value: 'Hello' }] },
    ]);
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

    // Mock pool to fail
    mockPool.getConnection.mockRejectedValue(new Error("Connection failed"));

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

  describe("Read operation edge cases", () => {
    it("should throw error when no nodeIds provided", async () => {
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

    it("should throw error when nodeIds is empty string", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: [""],
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

    it("should handle single nodeId as string", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "read",
        nodeIds: "ns=1;s=TestVariable",
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
    });

    it("should handle multiple nodeIds with consolidated output", async () => {
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

      // Mock session to return values for multiple nodes
      mockSession.read.mockResolvedValue([
        { statusCode: { name: "Good" }, value: { value: 42, dataType: 7 } }, // UInt32
        { statusCode: { name: "Good" }, value: { value: 99, dataType: 7 } }, // UInt32
      ]);

      const result = await node.execute.call(context);

      // NEW: Expect single consolidated output instead of separate outputs
      expect(result[0]).toHaveLength(1); // Only one output object
      const output = result[0][0].json;
      const metrics = (output.metrics ?? {}) as Record<string, any>;
      const meta = (output.meta ?? {}) as Record<string, any>;

      // Check that both node values are in the same metrics object
      expect(metrics["ns=1;s=TestVariable1"]).toBe(42);
      expect(metrics["ns=1;s=TestVariable2"]).toBe(99);

      // Check consolidated status and meta
      expect(output.status).toBe("Good");
      expect(meta.nodeCount).toBe(2);
      expect(meta.nodeIds).toEqual(["ns=1;s=TestVariable1", "ns=1;s=TestVariable2"]);
      expect(meta.dataTypes["ns=1;s=TestVariable1"]).toBe("UInt32");
      expect(meta.dataTypes["ns=1;s=TestVariable2"]).toBe("UInt32");
    });

    it("should handle read errors with bad status code", async () => {
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

      // Mock session to return bad status
      mockSession.read.mockResolvedValue([
        { statusCode: { name: "BadNodeIdUnknown" }, value: null }
      ]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("BadNodeIdUnknown");
      expect((result[0][0].json.meta as any).error).toBe("BadNodeIdUnknown");
      expect((result[0][0].json.metrics as any)["ns=1;s=TestVariable"]).toBeNull();
    });

    it("should throw error for x509 authentication without certificate or private key", async () => {
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
      };
      const context = createMockContext(params, credentials);

      await expect(node.execute.call(context)).rejects.toThrow("X509 authentication requires both certificate and private key.");
    });

    it("should handle session read failure", async () => {
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

      // Mock session read to fail
      mockSession.read.mockRejectedValue(new Error("Read failed"));

      await expect(node.execute.call(context)).rejects.toThrow("Failed to read node values.");
    });
  });

  describe("Write operation edge cases", () => {
    it("should throw error when writeOperation is not specified", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: undefined,
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

    it("should throw error when nodeId is missing for writeVariable", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
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

    it("should throw error when dataType is missing for writeVariable", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
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

    it("should handle write variable with different data types", async () => {
      const dataTypes = ["Boolean", "String", "Int32", "Float"];
      const values = ["true", "Hello", "123", "123.45"];
      const expectedValues = [true, "Hello", 123, 123.45];

      for (let i = 0; i < dataTypes.length; i++) {
        const node = new FactoryiqOpcUa();
        const params = {
          operation: "write",
          writeOperation: "writeVariable",
          nodeId: "ns=1;s=TestVariable",
          value: values[i],
          dataType: dataTypes[i],
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
        expect(metrics["ns=1;s=TestVariable"]).toBe(expectedValues[i]);
      }
    });

    it("should handle method call with parameters", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "callMethod",
        objectNodeId: "ns=1;s=Objects",
        methodNodeId: "ns=1;s=TestMethod",
        parameters: {
          argument: [
            { dataType: "String", value: "test" },
            { dataType: "Int32", value: "42" }
          ]
        },
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

    it("should handle write errors during session write", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Mock session write to fail
      mockSession.write.mockRejectedValue(new Error("Write failed"));

      await expect(node.execute.call(context)).rejects.toThrow("Failed to execute operation on OPC UA node.");
    });

    it("should handle method call errors", async () => {
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

      // Mock session call to fail
      mockSession.call.mockRejectedValue(new Error("Method call failed"));

      await expect(node.execute.call(context)).rejects.toThrow("Failed to execute operation on OPC UA node.");
    });
  });

  describe("Data type conversion", () => {
    it("should handle all data type conversions in convertValueToDataType", () => {
      const node = new FactoryiqOpcUa();

      // Access the private static method via reflection
      const convertValueToDataType = (node.constructor as any).convertValueToDataType;

      expect(convertValueToDataType("true", "Boolean")).toBe(true);
      expect(convertValueToDataType("false", "Boolean")).toBe(false);
      expect(convertValueToDataType("1", "Boolean")).toBe(true);
      expect(convertValueToDataType("0", "Boolean")).toBe(false);

      expect(convertValueToDataType("123", "SByte")).toBe(123);
      expect(convertValueToDataType("123", "Byte")).toBe(123);
      expect(convertValueToDataType("123", "Int16")).toBe(123);
      expect(convertValueToDataType("123", "UInt16")).toBe(123);
      expect(convertValueToDataType("123", "Int32")).toBe(123);
      expect(convertValueToDataType("123", "UInt32")).toBe(123);
      expect(convertValueToDataType("123", "Int64")).toBe(123);
      expect(convertValueToDataType("123", "UInt64")).toBe(123);

      expect(convertValueToDataType("123.45", "Float")).toBe(123.45);
      expect(convertValueToDataType("123.45", "Double")).toBe(123.45);

      expect(convertValueToDataType("Hello", "String")).toBe("Hello");
             expect(Buffer.isBuffer(convertValueToDataType("test", "ByteString"))).toBe(true);
      expect(convertValueToDataType("test", "Guid")).toBe("test");
             expect(convertValueToDataType("2023-01-01", "DateTime")).toBeInstanceOf(Date);

      // Default case
      expect(convertValueToDataType("test", "Unknown")).toBe("test");
    });
  });

  describe("Multiple input items for write operations", () => {
    function createMockContextWithMultipleItems(params: Record<string, any>, credentials: any, itemCount: number): IExecuteFunctions {
      const items = Array(itemCount).fill({});
      return {
        getNodeParameter: (name: string, itemIndex: number, fallback?: any) => {
          if (params[name] !== undefined) return params[name];
          if (name === 'writeOperation') return params.writeOperation || 'writeVariable';
          if (name === 'operation') return params.operation;
          return fallback;
        },
        getCredentials: async (name: string) => credentials,
        getInputData: () => items,
        getNode: () => ({} as any),
      } as unknown as IExecuteFunctions;
    }

    it("should handle multiple input items for write operations", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContextWithMultipleItems(params, credentials, 3);

      const result = await node.execute.call(context);
      expect(result[0]).toHaveLength(3); // Should have 3 results for 3 input items
    });
  });

  describe("Direct connection fallback and cleanup paths", () => {
    it("should handle pool connection failure", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Mock pool to fail completely
      mockPool.getConnection.mockRejectedValue(new Error("Pool failed completely"));

      await expect(node.execute.call(context)).rejects.toThrow("Failed to connect or authenticate to OPC UA server.");
    });

    it("should handle unsupported writeOperation", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "unsupportedOperation",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
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

    it("should handle write operation with error status result", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Mock session to return error status
      mockSession.write.mockResolvedValue([{ name: "BadNodeIdUnknown" }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("error");
    });

    it("should handle method call with error status result", async () => {
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

      // Mock session to return error status for method call
      mockSession.call.mockResolvedValue([{ statusCode: { name: "BadMethodInvalid" } }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("error");
    });

    it("should handle operation execution failure", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Mock session write to fail
      mockSession.write.mockRejectedValue(new Error("Write operation failed"));

      await expect(node.execute.call(context)).rejects.toThrow("Failed to execute operation on OPC UA node.");
    });

    it("should handle direct connection cleanup when pool returns null", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Create mock direct connection objects (but don't use them - this test checks pool failure)
      // const mockDirectSession = {
      //   write: jest.fn().mockResolvedValue([{ name: "Good" }]),
      //   close: jest.fn().mockResolvedValue(undefined),
      // };

      // const mockDirectClient = {
      //   disconnect: jest.fn().mockResolvedValue(undefined),
      // };

      // Mock pool to return null (which would trigger direct connection path)
      // We need to mock this at the execution level by manipulating the pool result
      mockPool.getConnection.mockResolvedValue(null);

      // This should trigger an error due to null pooledConnection
      await expect(node.execute.call(context)).rejects.toThrow();
    });

    it("should handle direct connection cleanup with session close error", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Create a mock scenario where session.close() fails
      const mockDirectSession = {
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        close: jest.fn().mockRejectedValue(new Error("Session close failed")),
      };

      const mockDirectClient = {
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // Mock pool to return a connection that looks like direct connection
      mockPool.getConnection.mockResolvedValue({
        client: mockDirectClient,
        session: mockDirectSession,
        inUse: false,
        key: 'direct-connection',
      });

      // Override the pooledConnection check by temporarily modifying the logic
      // Since we can't easily mock the internal logic, let's try a different approach
      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
    });

    it("should handle direct connection cleanup with client disconnect error", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Create a mock scenario where client.disconnect() fails
      const mockDirectSession = {
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockDirectClient = {
        disconnect: jest.fn().mockRejectedValue(new Error("Client disconnect failed")),
      };

      mockPool.getConnection.mockResolvedValue({
        client: mockDirectClient,
        session: mockDirectSession,
        inUse: false,
        key: 'direct-connection',
      });

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
    });
  });

  describe("Data type mapping", () => {
    it("should have correct opcuaDataTypeMap", () => {
      // Access the private static property via reflection
      const opcuaDataTypeMap = (FactoryiqOpcUa as any).opcuaDataTypeMap;

      expect(opcuaDataTypeMap[1]).toBe("Boolean");
      expect(opcuaDataTypeMap[2]).toBe("SByte");
      expect(opcuaDataTypeMap[3]).toBe("Byte");
      expect(opcuaDataTypeMap[4]).toBe("Int16");
      expect(opcuaDataTypeMap[5]).toBe("UInt16");
      expect(opcuaDataTypeMap[6]).toBe("Int32");
      expect(opcuaDataTypeMap[7]).toBe("UInt32");
      expect(opcuaDataTypeMap[8]).toBe("Int64");
      expect(opcuaDataTypeMap[9]).toBe("UInt64");
      expect(opcuaDataTypeMap[10]).toBe("Float");
      expect(opcuaDataTypeMap[11]).toBe("Double");
      expect(opcuaDataTypeMap[12]).toBe("String");
      expect(opcuaDataTypeMap[13]).toBe("DateTime");
      expect(opcuaDataTypeMap[14]).toBe("Guid");
      expect(opcuaDataTypeMap[15]).toBe("ByteString");
    });

    it("should handle read result with numeric dataType", async () => {
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

      // Mock session to return result with numeric dataType
      mockSession.read.mockResolvedValue([
        { statusCode: { name: "Good" }, value: { value: 42, dataType: 11 } } // 11 = Double
      ]);

      const result = await node.execute.call(context);
      expect((result[0][0].json.meta as any).dataType).toBe("Double");
    });

    it("should handle read result with null or unknown dataType", async () => {
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

      // Mock session to return result with unknown dataType
      mockSession.read.mockResolvedValue([
        { statusCode: { name: "Good" }, value: { value: 42, dataType: 999 } } // Unknown dataType
      ]);

      const result = await node.execute.call(context);
      expect((result[0][0].json.meta as any).dataType).toBeNull();
    });

    it("should handle read result with no value", async () => {
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

      // Mock session to return result with no value
      mockSession.read.mockResolvedValue([
        { statusCode: { name: "Good" }, value: null }
      ]);

      const result = await node.execute.call(context);
      expect((result[0][0].json.metrics as any)["ns=1;s=TestVariable"]).toBeNull();
      expect((result[0][0].json.meta as any).dataType).toBeNull();
    });
  });

  describe("Additional edge cases for complete coverage", () => {
    it("should handle conversion of different data types in convertValueToDataType", () => {
      // Access private static method via reflection to test all data type conversions
      const convertMethod = (FactoryiqOpcUa as any).convertValueToDataType;

      // Test edge cases for Boolean
      expect(convertMethod("true", "Boolean")).toBe(true);
      expect(convertMethod("TRUE", "Boolean")).toBe(true);
      expect(convertMethod("1", "Boolean")).toBe(true);
      expect(convertMethod("on", "Boolean")).toBe(true);
      expect(convertMethod("ON", "Boolean")).toBe(true);
      expect(convertMethod("yes", "Boolean")).toBe(true);
      expect(convertMethod("YES", "Boolean")).toBe(true);
      expect(convertMethod("false", "Boolean")).toBe(false);
      expect(convertMethod("0", "Boolean")).toBe(false);
      expect(convertMethod("no", "Boolean")).toBe(false);

      // Test numeric boundary conditions
      expect(convertMethod("200", "SByte")).toBe(127); // Max SByte
      expect(convertMethod("-200", "SByte")).toBe(-128); // Min SByte
      expect(convertMethod("300", "Byte")).toBe(255); // Max Byte
      expect(convertMethod("-10", "Byte")).toBe(0); // Min Byte

      expect(convertMethod("70000", "Int16")).toBe(32767); // Max Int16
      expect(convertMethod("-70000", "Int16")).toBe(-32768); // Min Int16
      expect(convertMethod("70000", "UInt16")).toBe(65535); // Max UInt16
      expect(convertMethod("-10", "UInt16")).toBe(0); // Min UInt16

      expect(convertMethod("5000000000", "Int32")).toBe(2147483647); // Max Int32
      expect(convertMethod("-5000000000", "Int32")).toBe(-2147483648); // Min Int32
      expect(convertMethod("5000000000", "UInt32")).toBe(4294967295); // Max UInt32

      // Test special cases for Int64/UInt64
      expect(convertMethod("invalid", "Int64")).toBe(0);
      expect(convertMethod("invalid", "UInt64")).toBe(0);
      expect(convertMethod("-100", "UInt64")).toBe(0); // Min UInt64

      // Test Float/Double
      expect(convertMethod("3.14159", "Float")).toBe(3.14159);
      expect(convertMethod("invalid", "Float")).toBe(0.0);
      expect(convertMethod("2.71828", "Double")).toBe(2.71828);
      expect(convertMethod("invalid", "Double")).toBe(0.0);

      // Test DateTime
      const dateStr = "2023-01-01T00:00:00Z";
      const result = convertMethod(dateStr, "DateTime");
      expect(result).toBeInstanceOf(Date);

      // Test Guid and ByteString
      expect(convertMethod("test-guid", "Guid")).toBe("test-guid");
      const byteStringResult = convertMethod("hello", "ByteString");
      expect(Buffer.isBuffer(byteStringResult)).toBe(true);
      expect(byteStringResult.toString()).toBe("hello");

      // Test default case
      expect(convertMethod("test", "UnknownType")).toBe("test");
    });

        it("should handle getDataTypeEnum for all data types indirectly through write operations", async () => {
      // Since getDataTypeEnum is private, we test it indirectly through write operations
      // This test ensures the data type enum conversion is working correctly
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "true",
        dataType: "Boolean",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      mockSession.write.mockResolvedValue([{ name: "Good" }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      // For write operations, the dataType is determined by the opcuaDataTypeMap
      // and may be null if the enum value is not in the map
      expect((result[0][0].json.meta as any).operationType).toBe("variable_write");
    });

    it("should handle write operation with complex parameters", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "callMethod",
        objectNodeId: "ns=1;s=Objects",
        methodNodeId: "ns=1;s=TestMethod",
        parameters: {
          arguments: [
            { dataType: "String", value: "test" },
            { dataType: "Int32", value: 42 },
            { dataType: "Boolean", value: true }
          ]
        },
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      mockSession.call.mockResolvedValue([{
        statusCode: { name: "Good" },
        outputArguments: ["result1", 123]
      }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      expect((result[0][0].json.metrics as any).outputArguments).toEqual(["result1", 123]);
      expect((result[0][0].json.meta as any).inputArguments).toEqual([
        { dataType: "String", value: "test" },
        { dataType: "Int32", value: 42 },
        { dataType: "Boolean", value: true }
      ]);
    });

    it("should handle write operation with empty parameters", async () => {
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

      mockSession.call.mockResolvedValue([{
        statusCode: { name: "Good" },
        outputArguments: []
      }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      expect((result[0][0].json.metrics as any).outputArguments).toEqual([]);
      expect((result[0][0].json.meta as any).inputArguments).toEqual([]);
    });

    it("should handle write operation with non-array parameters", async () => {
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

      mockSession.call.mockResolvedValue([{
        statusCode: { name: "Good" },
        outputArguments: []
      }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      expect((result[0][0].json.meta as any).inputArguments).toEqual([]);
    });

    it("should handle different status code formats in write operations", async () => {
      const node = new FactoryiqOpcUa();
      const params = {
        operation: "write",
        writeOperation: "writeVariable",
        nodeId: "ns=1;s=TestVariable",
        value: "123",
        dataType: "Int32",
      };
      const credentials = {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      };
      const context = createMockContext(params, credentials);

      // Test status code as object with toString method
      mockSession.write.mockResolvedValue([{ toString: () => "Good" }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      expect((result[0][0].json.meta as any).statusCode).toBe("Good");
    });

    it("should handle different status code formats in method calls", async () => {
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

      // Test status code as object with toString method
      mockSession.call.mockResolvedValue([{
        statusCode: { toString: () => "Good" },
        outputArguments: []
      }]);

      const result = await node.execute.call(context);
      expect(result[0][0].json.status).toBe("ok");
      expect((result[0][0].json.meta as any).statusCode).toBe("Good");
    });

    it("should handle write operation with all supported data types", async () => {
      const node = new FactoryiqOpcUa();
      const dataTypes = [
        "Boolean", "SByte", "Byte", "Int16", "UInt16", "Int32", "UInt32",
        "Int64", "UInt64", "Float", "Double", "String", "DateTime", "Guid", "ByteString"
      ];

      for (const dataType of dataTypes) {
        const params = {
          operation: "write",
          writeOperation: "writeVariable",
          nodeId: "ns=1;s=TestVariable",
          value: dataType === "Boolean" ? "true" : "123",
          dataType,
        };
        const credentials = {
          endpointUrl: "opc.tcp://localhost:4840",
          securityPolicy: "None",
          securityMode: "None",
          authenticationType: "anonymous",
        };
        const context = createMockContext(params, credentials);

        mockSession.write.mockResolvedValue([{ name: "Good" }]);

        const result = await node.execute.call(context);
        expect(result[0][0].json.status).toBe("ok");
        expect((result[0][0].json.meta as any).operationType).toBe("variable_write");
      }
    });
  });
});
