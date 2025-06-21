import { OpcUaCredentialsApi } from '../credentials/OpcUaCredentialsApi.credentials';

describe('OpcUaCredentialsApi', () => {
  let credentials: OpcUaCredentialsApi;

  beforeEach(() => {
    credentials = new OpcUaCredentialsApi();
  });

  it('should be defined and instantiable', () => {
    expect(credentials).toBeDefined();
    expect(credentials).toBeInstanceOf(OpcUaCredentialsApi);
  });

  it('should have correct name', () => {
    expect(credentials.name).toBe('opcUaCredentialsApi');
  });

  it('should have correct displayName', () => {
    expect(credentials.displayName).toBe('FactoryIQ OPC UA Credentials API');
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
});
