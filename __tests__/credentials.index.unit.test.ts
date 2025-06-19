import * as credentialsIndex from '../credentials/index';
import { OpcUaCredentialsApi } from '../credentials/OpcUaCredentialsApi.credentials';

describe('Credentials Index', () => {
  it('should export OpcUaCredentialsApi', () => {
    expect(credentialsIndex.OpcUaCredentialsApi).toBeDefined();
    expect(credentialsIndex.OpcUaCredentialsApi).toBe(OpcUaCredentialsApi);
  });

  it('should be able to instantiate exported credential class', () => {
    const credentials = new credentialsIndex.OpcUaCredentialsApi();
    expect(credentials).toBeInstanceOf(OpcUaCredentialsApi);
    expect(credentials.name).toBe('opcUaCredentialsApi');
  });
});
