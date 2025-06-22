import { OpcUaConnectionPool } from "../nodes/FactoryIQ/OpcUa/ConnectionPool";

// Mock the vendor module with comprehensive mock objects
jest.mock('../vendor', () => ({
  OPCUAClient: {
    create: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        close: jest.fn().mockResolvedValue(undefined),
        isChannelValid: jest.fn().mockReturnValue(true),
        isReconnecting: false,
      }),
    })),
  },
  SecurityPolicy: {
    None: 'None',
    Basic128Rsa15: 'Basic128Rsa15',
    Basic256: 'Basic256',
    Basic256Sha256: 'Basic256Sha256',
    Aes128_Sha256_RsaOaep: 'Aes128_Sha256_RsaOaep',
    Aes256_Sha256_RsaPss: 'Aes256_Sha256_RsaPss',
  },
  MessageSecurityMode: {
    None: 'None',
    Sign: 'Sign',
    SignAndEncrypt: 'SignAndEncrypt',
  },
  UserTokenType: {
    UserName: 'UserName',
    Certificate: 'Certificate',
  },
}));

describe("OpcUaConnectionPool", () => {
  let pool: OpcUaConnectionPool;
  let mockVendor: any;

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
      mockVendor = require('../vendor');
      jest.clearAllMocks();

      // Reset to default successful behavior
      mockVendor.OPCUAClient.create.mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
          isChannelValid: jest.fn().mockReturnValue(true),
          isReconnecting: false,
        }),
      }));
    });

  afterEach(async () => {
    try {
      await pool.shutdown();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
    (OpcUaConnectionPool as any).instance = undefined;
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

  it('should create a new connection when pool is empty', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    const connection = await pool.getConnection(credentials);

    expect(connection).toBeDefined();
    expect(connection.inUse).toBe(true);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalled();
  });

  it('should reuse available connection', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    // Get first connection and release it
    const connection1 = await pool.getConnection(credentials);
    pool.releaseConnection(connection1);

    // Get second connection - should reuse the first
    const connection2 = await pool.getConnection(credentials);

    expect(connection1).toBe(connection2);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should handle session validation failure and remove invalid connection', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    // Create a connection first
    const connection1 = await pool.getConnection(credentials);
    pool.releaseConnection(connection1);

    // Mock the session to be invalid on next check
    connection1.session.isChannelValid = jest.fn(() => {
      throw new Error('Session validation failed');
    });

    // Get connection again - should create new one due to invalid session
    const connection2 = await pool.getConnection(credentials);

    expect(connection2).not.toBe(connection1);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(2); // Called twice due to invalid session
  });



  it('should handle reconnecting session', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    // Create a connection first
    const connection1 = await pool.getConnection(credentials);
    pool.releaseConnection(connection1);

    // Mock the session to be reconnecting
    connection1.session.isReconnecting = true;

    // Get connection again - should create new one due to reconnecting session
    const connection2 = await pool.getConnection(credentials);

    expect(connection2).not.toBe(connection1);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(2);
  });

     it('should limit pool size to 3 connections and reuse first when full', async () => {
     const credentials = {
       endpointUrl: 'opc.tcp://localhost:4840',
       authenticationType: 'anonymous',
     };

     // Create 3 connections
     const conn1 = await pool.getConnection(credentials);
     await pool.getConnection(credentials); // conn2
     await pool.getConnection(credentials); // conn3

     // 4th connection should reuse the first one
     const conn4 = await pool.getConnection(credentials);

     expect(conn4).toBe(conn1);
     expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(3); // Only 3 new connections created
   });

  it('should handle connection creation failure', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://invalid-server',
      authenticationType: 'anonymous',
    };

    // Mock connection failure
    mockVendor.OPCUAClient.create.mockReturnValueOnce({
      connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
      disconnect: jest.fn().mockResolvedValue(undefined),
    });

    await expect(pool.getConnection(credentials)).rejects.toThrow('Connection failed');
  });

  it('should create different pools for different credentials', async () => {
    const credentials1 = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    const credentials2 = {
      endpointUrl: 'opc.tcp://localhost:4841',
      authenticationType: 'anonymous',
    };

    const conn1 = await pool.getConnection(credentials1);
    const conn2 = await pool.getConnection(credentials2);

    expect(conn1).not.toBe(conn2);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(2);
  });

  it('should handle username/password authentication', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'usernamePassword',
      username: 'testuser',
      password: 'testpass',
    };

    const connection = await pool.getConnection(credentials);

    expect(connection).toBeDefined();
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalled();
  });

  it('should handle x509 authentication with valid certificate', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'x509',
      certificate: 'test-cert-data',
      privateKey: 'test-key-data',
    };

    const connection = await pool.getConnection(credentials);

    expect(connection).toBeDefined();
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateData: expect.any(Buffer),
        privateKeyData: expect.any(Buffer),
      })
    );
  });

  it('should throw error for x509 authentication without certificate or private key', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'x509',
      // Missing certificate and privateKey
    };

    await expect(pool.getConnection(credentials)).rejects.toThrow(
      'X509 authentication requires both certificate and private key.'
    );
  });

  it('should handle all security policies', async () => {
    const policies = ['Basic256Sha256', 'Basic256', 'Basic128Rsa15', 'Aes128_Sha256_RsaOaep', 'Aes256_Sha256_RsaPss', 'None'];

    for (const policy of policies) {
      const credentials = {
        endpointUrl: `opc.tcp://localhost:484${policies.indexOf(policy)}`,
        authenticationType: 'anonymous',
        securityPolicy: policy,
      };

      const connection = await pool.getConnection(credentials);
      expect(connection).toBeDefined();
    }
  });

  it('should handle all security modes', async () => {
    const modes = ['Sign', 'SignAndEncrypt', 'Sign & Encrypt', 'None'];

    for (const mode of modes) {
      const credentials = {
        endpointUrl: `opc.tcp://localhost:485${modes.indexOf(mode)}`,
        authenticationType: 'anonymous',
        securityMode: mode,
      };

      const connection = await pool.getConnection(credentials);
      expect(connection).toBeDefined();
    }
  });

  it('should release connection properly', () => {
    const mockConnection = {
      client: {},
      session: {},
      inUse: true,
      key: 'test-key',
    };

    pool.releaseConnection(mockConnection);

    expect(mockConnection.inUse).toBe(false);
  });

  it('should handle null connection in releaseConnection', () => {
    // Should not throw error
    expect(() => pool.releaseConnection(null as any)).not.toThrow();
  });

     it('should shutdown gracefully and cleanup all connections', async () => {
     const credentials = {
       endpointUrl: 'opc.tcp://localhost:4840',
       authenticationType: 'anonymous',
     };

     // Create some connections
     await pool.getConnection(credentials);
     await pool.getConnection(credentials);

     // Mock session and client with close/disconnect methods
     const mockSession = { close: jest.fn().mockResolvedValue(undefined) };
     const mockClient = { disconnect: jest.fn().mockResolvedValue(undefined) };

     // Access the private pools property to set up proper mocks
     const pools = (pool as any).pools;
     for (const [, connections] of pools.entries()) {
       connections.forEach((conn: any) => {
         conn.session = mockSession;
         conn.client = mockClient;
       });
     }

     await pool.shutdown();

     expect(mockSession.close).toHaveBeenCalled();
     expect(mockClient.disconnect).toHaveBeenCalled();
   });

     it('should handle errors during shutdown gracefully', async () => {
     const credentials = {
       endpointUrl: 'opc.tcp://localhost:4840',
       authenticationType: 'anonymous',
     };

     // Create a connection
     await pool.getConnection(credentials);

     // Mock session and client to throw errors on cleanup
     const mockSession = { close: jest.fn().mockRejectedValue(new Error('Close failed')) };
     const mockClient = { disconnect: jest.fn().mockRejectedValue(new Error('Disconnect failed')) };

     // Access the private pools property to set up proper mocks
     const pools = (pool as any).pools;
     for (const [, connections] of pools.entries()) {
       connections.forEach((conn: any) => {
         conn.session = mockSession;
         conn.client = mockClient;
       });
     }

     // Should not throw errors during shutdown
     await expect(pool.shutdown()).resolves.toBeUndefined();
   });

  it('should create proper client name with random suffix', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    await pool.getConnection(credentials);

    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: expect.stringMatching(/^n8n-opcua-pool-[a-z0-9]{8}$/)
      })
    );
  });

  it('should handle missing session in connection during validation', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    // Create a connection first
    const connection1 = await pool.getConnection(credentials);
    pool.releaseConnection(connection1);

    // Remove the session to simulate a corrupted connection
    connection1.session = null;

    // Get connection again - should create new one due to missing session
    const connection2 = await pool.getConnection(credentials);

    expect(connection2).not.toBe(connection1);
    expect(mockVendor.OPCUAClient.create).toHaveBeenCalledTimes(2);
  });

  it('should handle session creation failure', async () => {
    const credentials = {
      endpointUrl: 'opc.tcp://localhost:4840',
      authenticationType: 'anonymous',
    };

    // Mock session creation failure
    mockVendor.OPCUAClient.create.mockReturnValueOnce({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockRejectedValue(new Error('Session creation failed')),
    });

    await expect(pool.getConnection(credentials)).rejects.toThrow('Session creation failed');
  });
});
