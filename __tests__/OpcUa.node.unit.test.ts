import { OpcUa } from "../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node";
import type { IExecuteFunctions } from "n8n-workflow";

jest.mock("node-opcua", () => ({
  OPCUAClient: {
    create: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        readVariableValue: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
        ]),
        write: jest.fn().mockResolvedValue([{ name: "Good" }]),
        call: jest.fn().mockResolvedValue([{ statusCode: { name: "Good" }, outputArguments: [{ value: "Hello" }] }]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    })),
  },
  SecurityPolicy: { None: "None" },
  MessageSecurityMode: { None: "None" },
  UserTokenType: { UserName: "UserName", Certificate: "Certificate" },
  DataType: { Double: "Double", String: "String" },
  AttributeIds: { Value: 13 },
}));

function createMockContext(params: Record<string, any>, credentials: any): IExecuteFunctions {
  // If writer mode, return a dummy input item so the for loop runs
  const isWriter = params.mode === 'writer';
  return {
    getNodeParameter: (name: string, itemIndex: number, fallback?: any) => params[name] ?? fallback,
    getCredentials: async (name: string) => credentials,
    getInputData: () => isWriter ? [{}] : [],
    getNode: () => ({} as any),
  } as unknown as IExecuteFunctions;
}

// Helper to set the default node-opcua mock for all session methods
function setDefaultNodeOpcuaMock() {
  jest.resetModules();
  jest.doMock("node-opcua", () => ({
    OPCUAClient: {
      create: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          readVariableValue: jest.fn().mockResolvedValue([
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
    const node = new OpcUa();
    const params = {
      mode: "reader",
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
    expect((result[0][0].json.metrics as Record<string, any>)["ns=1;s=TestVariable"]).toBe(42);
    expect(result[0][0].json.status).toBe("Good");
  });

  it("returns correct output in Writer mode (writeVariable)", async () => {
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    expect((result[0][0].json.metrics as Record<string, any>)["ns=1;s=WritableVariable"]).toBe(123.45);
    expect(result[0][0].json.status).toBe("ok");
  });

  it("returns correct output in Writer mode (callMethod)", async () => {
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "callMethod",
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
    expect(((result[0][0].json.metrics as any).outputArguments[0].value)).toBe("Hello");
    expect(result[0][0].json.status).toBe("ok");
  });

  it("handles errors gracefully", async () => {
    // Override the mock to throw
    const nodeOpcua = require("node-opcua");
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
      disconnect: jest.fn().mockResolvedValue(undefined),
    }));

    const node = new OpcUa();
    const params = {
      mode: "reader",
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
    const node = new OpcUa();
    const params = {
      mode: "reader",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const context = createMockContext(params, null);
    await expect(node.execute.call(context)).rejects.toThrow("No OPC UA credentials provided.");
  });

  it("throws on invalid mode", async () => {
    const node = new OpcUa();
    const params = {
      mode: "invalidMode",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    const context = createMockContext(params, credentials);
    await expect(node.execute.call(context)).rejects.toThrow("Invalid mode selected.");
  });

  it("throws on invalid operation in writer mode", async () => {
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "notARealOperation",
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
    const node = new OpcUa();
    const params = {
      mode: "reader",
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
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
      // nodeId missing
      value: "123.45",
      // dataType missing
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
    const node = new OpcUa();
    const params = {
      mode: "reader",
      nodeIds: ["ns=1;s=TestVariable"],
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
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
      nodeId: "ns=1;s=WritableVariable",
      value: "1",
      dataType: "Boolean",
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
        const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
        const node = new OpcUa();
        const params = {
          mode: "reader",
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
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "reader",
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
    const node = new OpcUa();
    const params = {
      mode: "reader",
      nodeIds: ["ns=1;s=TestVariable"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to throw in close/disconnect
    const nodeOpcua = require("node-opcua");
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockRejectedValue(new Error("disconnect error")),
      createSession: jest.fn().mockResolvedValue({
        readVariableValue: jest.fn().mockResolvedValue([
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
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    const nodeOpcua = require("node-opcua");
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

  it("handles error thrown in session.write (writer mode)", async () => {
    setDefaultNodeOpcuaMock();
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    const nodeOpcua = require("node-opcua");
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
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "callMethod",
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
    const nodeOpcua = require("node-opcua");
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
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "callMethod",
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
    expect(((result[0][0].json.metrics as any).outputArguments[0].value)).toBe("Hello");
    expect(result[0][0].json.status).toBe("ok");
  });

  it("reader: bad status code", async () => {
    const node = new OpcUa();
    const params = {
      mode: "reader",
      nodeIds: ["ns=1;s=BadNode"],
    };
    const credentials = {
      endpointUrl: "opc.tcp://localhost:4840",
      securityPolicy: "None",
      securityMode: "None",
      authenticationType: "anonymous",
    };
    // Patch the mock to return bad status
    const nodeOpcua = require("node-opcua");
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        readVariableValue: jest.fn().mockResolvedValue([
          { statusCode: { name: "BadNodeIdUnknown" }, value: { value: null, dataType: "Double" } }
        ]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const context = createMockContext(params, credentials);
    const result = await node.execute.call(context);
    expect(result[0][0].json.status).toBe("BadNodeIdUnknown");
    expect((result[0][0].json.metrics as Record<string, any>)["ns=1;s=BadNode"]).toBeNull();
  });

  it("writer: writeVariable with all supported data types", async () => {
    setDefaultNodeOpcuaMock();
    const dataTypes = [
      "Boolean", "SByte", "Byte", "Int16", "UInt16", "Int32", "UInt32", "Int64", "UInt64", "Float", "Double", "String", "DateTime", "Guid", "ByteString"
    ];
    for (const dataType of dataTypes) {
      setDefaultNodeOpcuaMock();
      const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
      const node = new OpcUa();
      const params = {
        mode: "writer",
        operation: "writeVariable",
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
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    expect(result[0][0].json.meta.dataType).toBe("UnknownType");
    expect(result[0][0].json.metrics["ns=1;s=WritableVariable"]).toBe("foobar");
  });

  it("writer: writeVariable with DateTime and invalid date string", async () => {
    setDefaultNodeOpcuaMock();
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    expect(result[0][0].json.metrics["ns=1;s=WritableVariable"]).toBeInstanceOf(Date);
    expect(isNaN(result[0][0].json.metrics["ns=1;s=WritableVariable"]).valueOf()).toBe(true); // Invalid Date
  });

  it("writer: writeVariable with ByteString and non-binary string", async () => {
    setDefaultNodeOpcuaMock();
    const { OpcUa } = require("../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node");
    const node = new OpcUa();
    const params = {
      mode: "writer",
      operation: "writeVariable",
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
    expect(Buffer.isBuffer(result[0][0].json.metrics["ns=1;s=WritableVariable"]))
      .toBe(true);
  });

  it("reader: result.value is undefined (should return null for metrics and meta.dataType)", async () => {
    // Patch the mock to return result.value as undefined
    const nodeOpcua = require("node-opcua");
    nodeOpcua.OPCUAClient.create = jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        readVariableValue: jest.fn().mockResolvedValue([
          { statusCode: { name: "Good" }, value: undefined }
        ]),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
    const node = new OpcUa();
    const params = {
      mode: "reader",
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
});
