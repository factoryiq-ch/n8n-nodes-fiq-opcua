import { FactoryiqOpcUa } from '../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node';
import { OpcUaConnectionPool } from '../nodes/FactoryIQ/OpcUa/ConnectionPool';

// Mock the connection pool
jest.mock('../nodes/FactoryIQ/OpcUa/ConnectionPool');

function setDefaultNodeOpcuaMock() {
  jest.resetModules();
  jest.doMock('../vendor', () => ({
    OPCUAClient: {
      create: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          read: jest.fn().mockResolvedValue([
            { statusCode: { name: "Good" }, value: { value: 42, dataType: "Double" } }
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
}

// Set the default mock before all tests
setDefaultNodeOpcuaMock();

describe("FactoryIQ OpcUA Node - Credential Tests", () => {
  beforeEach(() => {
    setDefaultNodeOpcuaMock();

    // Mock the connection pool for credential tests
    const mockPool = {
      getConnection: jest.fn().mockResolvedValue({
        client: { disconnect: jest.fn() },
        session: { close: jest.fn() },
        inUse: true,
        key: "test-key"
      }),
      releaseConnection: jest.fn(),
    };
    (OpcUaConnectionPool.getInstance as jest.Mock).mockReturnValue(mockPool);
  });

  it("should have credential test method", () => {
    const node = new FactoryiqOpcUa();
    expect(node.methods).toBeDefined();
    expect(node.methods.credentialTest).toBeDefined();
    expect(node.methods.credentialTest.opcUaConnectionTest).toBeDefined();
    expect(typeof node.methods.credentialTest.opcUaConnectionTest).toBe('function');
  });

  it("should test credentials successfully", async () => {
    const node = new FactoryiqOpcUa();
    const mockCredential = {
      data: {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      }
    };

    // Mock this context for credential testing
    const mockThis = {} as any;

    const result = await node.methods.credentialTest.opcUaConnectionTest.call(mockThis, mockCredential);
    expect(result).toBeDefined();
    expect(result.status).toBe('OK');
    expect(result.message).toBe('Connection successful!');
  });

  it("should handle credential test errors", async () => {
    // Mock a failing connection pool
    const mockPool = {
      getConnection: jest.fn().mockRejectedValue(new Error("Connection failed")),
      releaseConnection: jest.fn(),
    };
    (OpcUaConnectionPool.getInstance as jest.Mock).mockReturnValue(mockPool);

    const node = new FactoryiqOpcUa();
    const mockCredential = {
      data: {
        endpointUrl: "opc.tcp://invalid-server:4840",
        securityPolicy: "None",
        securityMode: "None",
        authenticationType: "anonymous",
      }
    };

    const mockThis = {} as any;
    const result = await node.methods.credentialTest.opcUaConnectionTest.call(mockThis, mockCredential);
    expect(result).toBeDefined();
    expect(result.status).toBe('Error');
    expect(result.message).toContain('Failed to connect to OPC UA server');
  });

  it("should handle credential test with x509 authentication", async () => {
    const node = new FactoryiqOpcUa();
    const mockCredential = {
      data: {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "Basic256Sha256",
        securityMode: "SignAndEncrypt",
        authenticationType: "x509",
        certificate: "test-certificate",
        privateKey: "test-private-key",
      }
    };

    const mockThis = {} as any;
    const result = await node.methods.credentialTest.opcUaConnectionTest.call(mockThis, mockCredential);
    expect(result).toBeDefined();
    expect(result.status).toBe('OK');
    expect(result.message).toBe('Connection successful!');
  });

  it("should handle credential test with username authentication", async () => {
    const node = new FactoryiqOpcUa();
    const mockCredential = {
      data: {
        endpointUrl: "opc.tcp://localhost:4840",
        securityPolicy: "Basic256Sha256",
        securityMode: "Sign",
        authenticationType: "username",
        username: "testuser",
        password: "testpassword",
      }
    };

    const mockThis = {} as any;
    const result = await node.methods.credentialTest.opcUaConnectionTest.call(mockThis, mockCredential);
    expect(result).toBeDefined();
    expect(result.status).toBe('OK');
    expect(result.message).toBe('Connection successful!');
  });
});
