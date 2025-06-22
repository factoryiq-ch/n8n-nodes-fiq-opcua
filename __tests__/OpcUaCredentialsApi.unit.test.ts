import { OpcUaCredentialsApi } from '../credentials/OpcUaCredentialsApi.credentials';
import { FactoryiqOpcUa } from '../nodes/FactoryIQ/OpcUa/FactoryiqOpcUa.node';
import type { ICredentialTestFunctions } from 'n8n-workflow';

// Mock the vendor module
jest.mock('../vendor', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue({
      close: jest.fn().mockResolvedValue(undefined),
    }),
  };

  return {
    OPCUAClient: {
      create: jest.fn(() => mockClient),
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
  };
});

describe('OpcUaCredentialsApi', () => {
  let credentials: OpcUaCredentialsApi;

  beforeEach(() => {
    credentials = new OpcUaCredentialsApi();
    jest.clearAllMocks();
  });

  it('should be defined and instantiable', () => {
    expect(credentials).toBeDefined();
    expect(credentials).toBeInstanceOf(OpcUaCredentialsApi);
  });

  it('should have correct name', () => {
    expect(credentials.name).toBe('opcUaCredentialsApi');
  });

  it('should have correct displayName', () => {
    expect(credentials.displayName).toBe('FactoryIQ OPC UA Account API');
  });

  it('should have correct documentationUrl', () => {
    expect(credentials.documentationUrl).toBe('https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua?tab=readme-ov-file#configuration');
  });

  it('should have correct icon', () => {
    expect(credentials.icon).toBe('file:FactoryIQ.svg');
  });

  it('should have properties array', () => {
    expect(credentials.properties).toBeDefined();
    expect(Array.isArray(credentials.properties)).toBe(true);
    expect(credentials.properties.length).toBe(8);
  });

  describe('properties', () => {
    it('should have endpointUrl property', () => {
      const endpointUrlProperty = credentials.properties.find(p => p.name === 'endpointUrl');
      expect(endpointUrlProperty).toBeDefined();
      expect(endpointUrlProperty?.displayName).toBe('Endpoint URL');
      expect(endpointUrlProperty?.type).toBe('string');
      expect(endpointUrlProperty?.default).toBe('');
      expect(endpointUrlProperty?.placeholder).toBe('opc.tcp://host:port');
      expect(endpointUrlProperty?.description).toContain('The OPC UA server endpoint URL');
    });

    it('should have securityPolicy property', () => {
      const securityPolicyProperty = credentials.properties.find(p => p.name === 'securityPolicy');
      expect(securityPolicyProperty).toBeDefined();
      expect(securityPolicyProperty?.displayName).toBe('Security Policy');
      expect(securityPolicyProperty?.type).toBe('options');
      expect(securityPolicyProperty?.default).toBe('None');
      expect(securityPolicyProperty?.options).toBeDefined();
      expect(securityPolicyProperty?.options?.length).toBe(6);

      // Check specific security policy options
      const options = securityPolicyProperty?.options as Array<{name: string, value: string}> || [];
      expect(options.some(opt => opt.value === 'None')).toBe(true);
      expect(options.some(opt => opt.value === 'Basic128Rsa15')).toBe(true);
      expect(options.some(opt => opt.value === 'Basic256')).toBe(true);
      expect(options.some(opt => opt.value === 'Basic256Sha256')).toBe(true);
      expect(options.some(opt => opt.value === 'Aes128_Sha256_RsaOaep')).toBe(true);
      expect(options.some(opt => opt.value === 'Aes256_Sha256_RsaPss')).toBe(true);
    });

    it('should have securityMode property', () => {
      const securityModeProperty = credentials.properties.find(p => p.name === 'securityMode');
      expect(securityModeProperty).toBeDefined();
      expect(securityModeProperty?.displayName).toBe('Security Mode');
      expect(securityModeProperty?.type).toBe('options');
      expect(securityModeProperty?.default).toBe('None');
      expect(securityModeProperty?.options).toBeDefined();
      expect(securityModeProperty?.options?.length).toBe(3);

      // Check specific security mode options
      const options = securityModeProperty?.options as Array<{name: string, value: string}> || [];
      expect(options.some(opt => opt.value === 'None')).toBe(true);
      expect(options.some(opt => opt.value === 'Sign')).toBe(true);
      expect(options.some(opt => opt.value === 'SignAndEncrypt')).toBe(true);
    });

    it('should have authenticationType property', () => {
      const authTypeProperty = credentials.properties.find(p => p.name === 'authenticationType');
      expect(authTypeProperty).toBeDefined();
      expect(authTypeProperty?.displayName).toBe('Authentication Type');
      expect(authTypeProperty?.type).toBe('options');
      expect(authTypeProperty?.default).toBe('anonymous');
      expect(authTypeProperty?.options).toBeDefined();
      expect(authTypeProperty?.options?.length).toBe(3);

      // Check specific authentication type options
      const options = authTypeProperty?.options as Array<{name: string, value: string}> || [];
      expect(options.some(opt => opt.value === 'anonymous')).toBe(true);
      expect(options.some(opt => opt.value === 'usernamePassword')).toBe(true);
      expect(options.some(opt => opt.value === 'x509')).toBe(true);
    });

    it('should have username property with correct displayOptions', () => {
      const usernameProperty = credentials.properties.find(p => p.name === 'username');
      expect(usernameProperty).toBeDefined();
      expect(usernameProperty?.displayName).toBe('Username');
      expect(usernameProperty?.type).toBe('string');
      expect(usernameProperty?.default).toBe('');
      expect(usernameProperty?.displayOptions).toBeDefined();
      expect(usernameProperty?.displayOptions?.show?.authenticationType).toEqual(['usernamePassword']);
    });

    it('should have password property with correct displayOptions and password type', () => {
      const passwordProperty = credentials.properties.find(p => p.name === 'password');
      expect(passwordProperty).toBeDefined();
      expect(passwordProperty?.displayName).toBe('Password');
      expect(passwordProperty?.type).toBe('string');
      expect(passwordProperty?.default).toBe('');
      expect(passwordProperty?.typeOptions?.password).toBe(true);
      expect(passwordProperty?.displayOptions).toBeDefined();
      expect(passwordProperty?.displayOptions?.show?.authenticationType).toEqual(['usernamePassword']);
    });

    it('should have certificate property with correct displayOptions', () => {
      const certificateProperty = credentials.properties.find(p => p.name === 'certificate');
      expect(certificateProperty).toBeDefined();
      expect(certificateProperty?.displayName).toBe('Certificate (PEM)');
      expect(certificateProperty?.type).toBe('string');
      expect(certificateProperty?.default).toBe('');
      expect(certificateProperty?.typeOptions?.rows).toBe(4);
      expect(certificateProperty?.description).toContain('PEM-encoded X509 certificate');
      expect(certificateProperty?.displayOptions).toBeDefined();
      expect(certificateProperty?.displayOptions?.show?.authenticationType).toEqual(['x509']);
    });

    it('should have privateKey property with correct displayOptions and password type', () => {
      const privateKeyProperty = credentials.properties.find(p => p.name === 'privateKey');
      expect(privateKeyProperty).toBeDefined();
      expect(privateKeyProperty?.displayName).toBe('Private Key (PEM)');
      expect(privateKeyProperty?.type).toBe('string');
      expect(privateKeyProperty?.default).toBe('');
      expect(privateKeyProperty?.typeOptions?.rows).toBe(4);
      expect(privateKeyProperty?.typeOptions?.password).toBe(true);
      expect(privateKeyProperty?.description).toContain('PEM-encoded private key');
      expect(privateKeyProperty?.displayOptions).toBeDefined();
      expect(privateKeyProperty?.displayOptions?.show?.authenticationType).toEqual(['x509']);
    });
  });

  it('should have all required ICredentialType properties', () => {
    // Test that the class implements the ICredentialType interface correctly
    expect(typeof credentials.name).toBe('string');
    expect(typeof credentials.displayName).toBe('string');
    expect(typeof credentials.documentationUrl).toBe('string');
    expect(typeof credentials.icon).toBe('string');
    expect(Array.isArray(credentials.properties)).toBe(true);
  });

  it('should have consistent property structure', () => {
    // Test that all properties have required fields
    credentials.properties.forEach((property, index) => {
      expect(property.name).toBeDefined();
      expect(typeof property.name).toBe('string');
      expect(property.displayName).toBeDefined();
      expect(typeof property.displayName).toBe('string');
      expect(property.type).toBeDefined();
      expect(typeof property.type).toBe('string');
      expect(property.default).toBeDefined();
    });
  });

  it('should have properties with unique names', () => {
    const propertyNames = credentials.properties.map(p => p.name);
    const uniqueNames = [...new Set(propertyNames)];
    expect(propertyNames.length).toBe(uniqueNames.length);
  });

  describe('opcuaConnectionTest', () => {
    let opcuaNode: FactoryiqOpcUa;
    let mockCredentialTestFunctions: jest.Mocked<ICredentialTestFunctions>;
    let mockVendor: any;
    let mockClient: any;

    beforeEach(() => {
      opcuaNode = new FactoryiqOpcUa();
      mockCredentialTestFunctions = {} as jest.Mocked<ICredentialTestFunctions>;
      mockVendor = require('../vendor');
      mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        createSession: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
        }),
      };
      mockVendor.OPCUAClient.create.mockReturnValue(mockClient);
      jest.clearAllMocks();
    });

    const testCredential = (data: any) => ({ data });

    it('should return error when no credentials provided', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential(null)
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'No credentials provided.',
      });
    });

    it('should return error when endpointUrl is empty', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({ endpointUrl: '' })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Endpoint URL is required and cannot be empty.',
      });
    });

    it('should return error when endpointUrl is whitespace only', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({ endpointUrl: '   ' })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Endpoint URL is required and cannot be empty.',
      });
    });

    it('should return error when endpointUrl has invalid format', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({ endpointUrl: 'http://localhost:4840' })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Endpoint URL must start with opc.tcp:// or opc.https://. Received: "http://localhost:4840"',
      });
    });

    it('should successfully test connection with anonymous authentication', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          securityPolicy: 'None',
          securityMode: 'None',
          authenticationType: 'anonymous',
        })
      );

      expect(mockVendor.OPCUAClient.create).toHaveBeenCalledWith({
        securityPolicy: 'None',
        securityMode: 'None',
        connectionStrategy: { initialDelay: 1000, maxRetry: 1, maxDelay: 2000 },
        clientName: 'n8n-opcua-credential-test',
        requestedSessionTimeout: 10000,
        endpointMustExist: false,
        securityOptions: { rejectUnauthorized: false },
      });
      expect(mockClient.connect).toHaveBeenCalledWith('opc.tcp://localhost:4840');
      expect(mockClient.createSession).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        status: 'OK',
        message: 'Connection successful!',
      });
    });

    it('should successfully test connection with username/password authentication', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          securityPolicy: 'Basic256Sha256',
          securityMode: 'Sign',
          authenticationType: 'usernamePassword',
          username: 'testuser',
          password: 'testpass',
        })
      );

      expect(mockVendor.OPCUAClient.create).toHaveBeenCalledWith({
        securityPolicy: 'Basic256Sha256',
        securityMode: 'Sign',
        connectionStrategy: { initialDelay: 1000, maxRetry: 1, maxDelay: 2000 },
        clientName: 'n8n-opcua-credential-test',
        requestedSessionTimeout: 10000,
        endpointMustExist: false,
        securityOptions: { rejectUnauthorized: false },
      });
      expect(mockClient.createSession).toHaveBeenCalledWith({
        type: 'UserName',
        userName: 'testuser',
        password: 'testpass',
      });
      expect(result).toEqual({
        status: 'OK',
        message: 'Connection successful!',
      });
    });

    it('should successfully test connection with x509 authentication', async () => {
      const testCert = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      const testKey = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          securityPolicy: 'Basic256',
          securityMode: 'SignAndEncrypt',
          authenticationType: 'x509',
          certificate: testCert,
          privateKey: testKey,
        })
      );

      expect(mockVendor.OPCUAClient.create).toHaveBeenCalledWith({
        securityPolicy: 'Basic256',
        securityMode: 'SignAndEncrypt',
        connectionStrategy: { initialDelay: 1000, maxRetry: 1, maxDelay: 2000 },
        clientName: 'n8n-opcua-credential-test',
        requestedSessionTimeout: 10000,
        endpointMustExist: false,
        securityOptions: { rejectUnauthorized: false },
        certificateData: Buffer.from(testCert),
        privateKeyData: Buffer.from(testKey),
      });
      expect(mockClient.createSession).toHaveBeenCalledWith({
        type: 'Certificate',
        certificateData: testCert,
        privateKey: testKey,
      });
      expect(result).toEqual({
        status: 'OK',
        message: 'Connection successful!',
      });
    });

    it('should return error for x509 authentication without certificate', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'x509',
          privateKey: 'test-key',
        })
      );

      expect(result.status).toBe('Error');
      expect(result.message).toContain('X509 authentication requires both certificate and private key');
    });

    it('should return error for x509 authentication without private key', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'x509',
          certificate: 'test-cert',
        })
      );

      expect(result.status).toBe('Error');
      expect(result.message).toContain('X509 authentication requires both certificate and private key');
    });

    it('should test all security policies', async () => {
      const policies = ['Basic128Rsa15', 'Basic256', 'Basic256Sha256', 'Aes128_Sha256_RsaOaep', 'Aes256_Sha256_RsaPss'];

      for (const policy of policies) {
        await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
          mockCredentialTestFunctions,
          testCredential({
            endpointUrl: 'opc.tcp://localhost:4840',
            securityPolicy: policy,
            securityMode: 'None',
            authenticationType: 'anonymous',
          })
        );

        expect(mockVendor.OPCUAClient.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            securityPolicy: policy,
          })
        );
      }
    });

    it('should test all security modes', async () => {
      const modes = ['Sign', 'SignAndEncrypt', 'Sign & Encrypt'];
      const expectedModes = ['Sign', 'SignAndEncrypt', 'SignAndEncrypt'];

      for (let i = 0; i < modes.length; i++) {
        await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
          mockCredentialTestFunctions,
          testCredential({
            endpointUrl: 'opc.tcp://localhost:4840',
            securityPolicy: 'None',
            securityMode: modes[i],
            authenticationType: 'anonymous',
          })
        );

        expect(mockVendor.OPCUAClient.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            securityMode: expectedModes[i],
          })
        );
      }
    });

    it('should handle connection errors gracefully', async () => {
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'anonymous',
        })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Connection failed',
      });
    });

    it('should handle session creation errors gracefully', async () => {
      mockClient.createSession.mockRejectedValueOnce(new Error('Session creation failed'));

      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'anonymous',
        })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Session creation failed',
      });
    });

    it('should disconnect client even when session close fails', async () => {
      const mockSession = { close: jest.fn().mockRejectedValue(new Error('Close failed')) };
      mockClient.createSession.mockResolvedValueOnce(mockSession);

      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'anonymous',
        })
      );

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'Error',
        message: 'Close failed',
      });
    });

    it('should handle opc.https:// protocol', async () => {
      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.https://localhost:4840',
          authenticationType: 'anonymous',
        })
      );

      expect(mockClient.connect).toHaveBeenCalledWith('opc.https://localhost:4840');
      expect(result.status).toBe('OK');
    });

    it('should clean up client on disconnect failure', async () => {
      mockClient.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'));
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await opcuaNode.methods.credentialTest.opcuaConnectionTest.call(
        mockCredentialTestFunctions,
        testCredential({
          endpointUrl: 'opc.tcp://localhost:4840',
          authenticationType: 'anonymous',
        })
      );

      expect(result).toEqual({
        status: 'Error',
        message: 'Connection failed',
      });
      // Should still attempt to disconnect despite the error
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });
});
