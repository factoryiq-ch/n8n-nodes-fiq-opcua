import { OpcUaConnectionPool } from "../nodes/FactoryIQ/OpcUa/ConnectionPool";

// Mock the vendor module
jest.mock('../vendor', () => ({
  OPCUAClient: {
    create: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: false,
        close: jest.fn().mockResolvedValue(undefined),
      }),
    })),
  },
  SecurityPolicy: {
    None: 'None',
    Basic128Rsa15: 'Basic128Rsa15',
    Basic256: 'Basic256',
    Basic256Sha256: 'Basic256Sha256',
    Aes128_Sha256_RsaOaep: 'Aes128_Sha256_RsaOaep',
    Aes256_Sha256_RsaPss: 'Aes256_Sha256_RsaPss'
  },
  MessageSecurityMode: {
    None: 'None',
    Sign: 'Sign',
    SignAndEncrypt: 'SignAndEncrypt'
  },
  UserTokenType: {
    UserName: 'UserName',
    Certificate: 'Certificate'
  },
}));

describe("OpcUaConnectionPool", () => {
  let pool: OpcUaConnectionPool;
  const mockCredentials = {
    endpointUrl: "opc.tcp://localhost:4840",
    securityPolicy: "None",
    securityMode: "None",
    authenticationType: "anonymous",
  };

  const mockCredentials2 = {
    endpointUrl: "opc.tcp://localhost:4841",
    securityPolicy: "None",
    securityMode: "None",
    authenticationType: "anonymous",
  };

    beforeEach(() => {
    // Reset the singleton instance before each test
    (OpcUaConnectionPool as any).instance = undefined;
    pool = OpcUaConnectionPool.getInstance();
    jest.clearAllMocks();

    // Reset to default mock behavior that creates new instances each time
    require('../vendor').OPCUAClient.create.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: false,
        close: jest.fn().mockResolvedValue(undefined),
      }),
    }));
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const pool1 = OpcUaConnectionPool.getInstance();
      const pool2 = OpcUaConnectionPool.getInstance();
      expect(pool1).toBe(pool2);
    });

    it("should maintain state across getInstance calls", async () => {
      const pool1 = OpcUaConnectionPool.getInstance();
      const connection1 = await pool1.getConnection(mockCredentials);

      const pool2 = OpcUaConnectionPool.getInstance();
      expect(pool1).toBe(pool2);

      // The second call should reuse the same connection
      pool1.releaseConnection(connection1);
      const connection2 = await pool2.getConnection(mockCredentials);
      expect(connection2.client).toBe(connection1.client);
    });
  });

  describe("Connection Creation", () => {
    it("should create a new connection on first request", async () => {
      const connection = await pool.getConnection(mockCredentials);

      expect(connection).toBeDefined();
      expect(connection.client).toBeDefined();
      expect(connection.session).toBeDefined();
      expect(connection.inUse).toBe(true);
      expect(connection.key).toBeDefined();
    });

        it("should create connections for different credentials", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const connection2 = await pool.getConnection(mockCredentials2);

      expect(connection1.client).not.toBe(connection2.client);
      expect(connection1.key).not.toBe(connection2.key);

      // Clean up
      pool.releaseConnection(connection1);
      pool.releaseConnection(connection2);
    });

    it("should create connection key correctly", async () => {
      const connection = await pool.getConnection(mockCredentials);
      expect(connection.key).toBe("opc.tcp://localhost:4840|anonymous|");
    });

    it("should include username in connection key", async () => {
      const credentialsWithUser = {
        ...mockCredentials,
        authenticationType: "usernamePassword",
        username: "testuser",
        password: "testpass"
      };

      const connection = await pool.getConnection(credentialsWithUser);
      expect(connection.key).toBe("opc.tcp://localhost:4840|usernamePassword|testuser");
    });
  });

  describe("Connection Reuse", () => {
    it("should reuse connection when released and requested again", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const originalClient = connection1.client;

      pool.releaseConnection(connection1);
      expect(connection1.inUse).toBe(false);

      const connection2 = await pool.getConnection(mockCredentials);
      expect(connection2.client).toBe(originalClient);
      expect(connection2.inUse).toBe(true);
    });

        it("should not reuse connection that is still in use", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      // Don't release connection1

      // Since connection1 is in use, pool should create a new connection
      const connection2 = await pool.getConnection(mockCredentials);
      expect(connection2.client).not.toBe(connection1.client);

      // Clean up
      pool.releaseConnection(connection1);
      pool.releaseConnection(connection2);
    });

        it("should find available connection among multiple connections", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const connection2 = await pool.getConnection(mockCredentials);
      const connection3 = await pool.getConnection(mockCredentials);

      // Release the middle one
      pool.releaseConnection(connection2);

      const connection4 = await pool.getConnection(mockCredentials);
      expect(connection4.client).toBe(connection2.client);

      // Clean up
      pool.releaseConnection(connection1);
      pool.releaseConnection(connection3);
      pool.releaseConnection(connection4);
    });
  });

  describe("Pool Size Limits", () => {
        it("should create up to 3 connections per credential", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const connection2 = await pool.getConnection(mockCredentials);
      const connection3 = await pool.getConnection(mockCredentials);

      expect(connection1.client).not.toBe(connection2.client);
      expect(connection2.client).not.toBe(connection3.client);
      expect(connection1.client).not.toBe(connection3.client);

      // Clean up to avoid affecting other tests
      pool.releaseConnection(connection1);
      pool.releaseConnection(connection2);
      pool.releaseConnection(connection3);
    });

        it("should reuse first connection when pool is full", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const connection2 = await pool.getConnection(mockCredentials);
      const connection3 = await pool.getConnection(mockCredentials);

      // Pool is full (3 connections), next request should reuse first
      const connection4 = await pool.getConnection(mockCredentials);
      expect(connection4.client).toBe(connection1.client);
      expect(connection4.inUse).toBe(true);

      // Clean up
      pool.releaseConnection(connection2);
      pool.releaseConnection(connection3);
      pool.releaseConnection(connection4);
    });
  });

  describe("Session Validation", () => {
    it("should validate session before reuse", async () => {
      const mockSession = {
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: false,
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue(mockSession),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => mockClient);

      const connection1 = await pool.getConnection(mockCredentials);
      pool.releaseConnection(connection1);

      const connection2 = await pool.getConnection(mockCredentials);
      expect(mockSession.isChannelValid).toHaveBeenCalled();

      // Clean up
      pool.releaseConnection(connection2);
    });

    it("should remove invalid session from pool", async () => {
      const mockSession = {
        isChannelValid: jest.fn().mockReturnValue(false),
        isReconnecting: false,
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue(mockSession),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => ({
        ...mockClient,
        createSession: jest.fn().mockResolvedValue({
          ...mockSession,
          isChannelValid: jest.fn().mockReturnValue(false),
        }),
      }));

      const connection1 = await pool.getConnection(mockCredentials);
      const originalClient = connection1.client;
      pool.releaseConnection(connection1);

      // Make session invalid for subsequent connections
      require('../vendor').OPCUAClient.create.mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          isChannelValid: jest.fn().mockReturnValue(false),
          isReconnecting: false,
          close: jest.fn().mockResolvedValue(undefined),
        }),
      }));

      const connection2 = await pool.getConnection(mockCredentials);
      // Should create new connection since old one was invalid
      expect(connection2.client).not.toBe(originalClient);
    });

    it("should handle session validation errors", async () => {
      const mockSession = {
        isChannelValid: jest.fn().mockImplementation(() => {
          throw new Error("Session validation failed");
        }),
        isReconnecting: false,
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue(mockSession),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => mockClient);

      const connection1 = await pool.getConnection(mockCredentials);
      pool.releaseConnection(connection1);

      // Should handle the error and create new connection
      const connection2 = await pool.getConnection(mockCredentials);
      expect(connection2).toBeDefined();
    });

        it("should skip reconnecting sessions", async () => {
      const mockSession = {
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: true, // This should be skipped
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue(mockSession),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => mockClient);

            const connection1 = await pool.getConnection(mockCredentials);
      pool.releaseConnection(connection1);

      // Create a different mock for the second connection
      require('../vendor').OPCUAClient.create.mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          isChannelValid: jest.fn().mockReturnValue(true),
          isReconnecting: false,
          close: jest.fn().mockResolvedValue(undefined),
        }),
      }));

      const connection2 = await pool.getConnection(mockCredentials);
      // Should create new connection since old one is reconnecting
      expect(connection2.client).not.toBe(connection1.client);

      // Clean up
      pool.releaseConnection(connection1);
      pool.releaseConnection(connection2);
    });
  });

  describe("Error Handling", () => {
    it("should throw error when connection creation fails", async () => {
      const mockClient = {
        connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => mockClient);

      await expect(pool.getConnection(mockCredentials)).rejects.toThrow("Connection failed");
    });

    it("should throw error when session creation fails", async () => {
      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockRejectedValue(new Error("Session creation failed")),
      };

      require('../vendor').OPCUAClient.create.mockImplementation(() => mockClient);

      await expect(pool.getConnection(mockCredentials)).rejects.toThrow("Session creation failed");
    });
  });

  describe("Security Configuration", () => {
    it("should handle different security policies", async () => {
      const secureCredentials = {
        ...mockCredentials,
        securityPolicy: "Basic256Sha256",
        securityMode: "SignAndEncrypt",
      };

      const connection = await pool.getConnection(secureCredentials);
      expect(connection).toBeDefined();
    });

    it("should handle X509 authentication", async () => {
      const x509Credentials = {
        ...mockCredentials,
        authenticationType: "x509",
        certificate: "dummy-cert",
        privateKey: "dummy-key",
      };

      const connection = await pool.getConnection(x509Credentials);
      expect(connection).toBeDefined();
    });

    it("should throw error for X509 without certificate", async () => {
      const invalidX509Credentials = {
        ...mockCredentials,
        authenticationType: "x509",
        // Missing certificate and privateKey
      };

      await expect(pool.getConnection(invalidX509Credentials)).rejects.toThrow(
        "X509 authentication requires both certificate and private key"
      );
    });

    it("should throw error for X509 without private key", async () => {
      const invalidX509Credentials = {
        ...mockCredentials,
        authenticationType: "x509",
        certificate: "dummy-cert",
        // Missing privateKey
      };

      await expect(pool.getConnection(invalidX509Credentials)).rejects.toThrow(
        "X509 authentication requires both certificate and private key"
      );
    });
  });

  describe("Shutdown", () => {
    it("should close all connections on shutdown", async () => {
      const connection1 = await pool.getConnection(mockCredentials);
      const connection2 = await pool.getConnection(mockCredentials2);

      const mockSession1 = connection1.session;
      const mockClient1 = connection1.client;
      const mockSession2 = connection2.session;
      const mockClient2 = connection2.client;

      await pool.shutdown();

      expect(mockSession1.close).toHaveBeenCalled();
      expect(mockClient1.disconnect).toHaveBeenCalled();
      expect(mockSession2.close).toHaveBeenCalled();
      expect(mockClient2.disconnect).toHaveBeenCalled();
    });

    it("should handle errors during shutdown gracefully", async () => {
      const connection = await pool.getConnection(mockCredentials);

      // Make close and disconnect throw errors
      connection.session.close.mockRejectedValue(new Error("Close failed"));
      connection.client.disconnect.mockRejectedValue(new Error("Disconnect failed"));

      // Should not throw despite errors
      await expect(pool.shutdown()).resolves.not.toThrow();
    });

    it("should clear pools after shutdown", async () => {
      await pool.getConnection(mockCredentials);
      await pool.shutdown();

      // After shutdown, requesting connection should create new one
      const newConnection = await pool.getConnection(mockCredentials);
      expect(newConnection).toBeDefined();
    });
  });

  describe("Connection Release", () => {
    it("should handle release of null connection", () => {
      expect(() => pool.releaseConnection(null as any)).not.toThrow();
    });

    it("should handle release of undefined connection", () => {
      expect(() => pool.releaseConnection(undefined as any)).not.toThrow();
    });

    it("should mark connection as not in use when released", async () => {
      const connection = await pool.getConnection(mockCredentials);
      expect(connection.inUse).toBe(true);

      pool.releaseConnection(connection);
      expect(connection.inUse).toBe(false);
    });
  });
});
