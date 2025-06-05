import {
	ICredentialType,
	INodeProperties,
	Icon,
	type ICredentialTestRequest,
	type ICredentialTestFunctions,
	type INodeCredentialTestResult,
} from 'n8n-workflow';

export class OpcUaCredential implements ICredentialType {
	name = 'opcUaCredential';
	displayName = 'OPC UA Credential';
	documentationUrl = 'docs/opcua-credential.md';
	icon = 'file:FactoryIQ.svg' as Icon;

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint URL',
			name: 'endpointUrl',
			type: 'string',
			default: '',
			placeholder: 'opc.tcp://host:port',
			description: 'The OPC UA server endpoint URL (e.g., opc.tcp://localhost:4840). Must start with opc.tcp:// or opc.https://',
		},
		{
			displayName: 'Security Policy',
			name: 'securityPolicy',
			type: 'options',
			options: [
				{ name: 'None', value: 'None' },
				{ name: 'Basic128Rsa15', value: 'Basic128Rsa15' },
				{ name: 'Basic256', value: 'Basic256' },
				{ name: 'Basic256Sha256', value: 'Basic256Sha256' },
				{ name: 'Aes128_Sha256_RsaOaep', value: 'Aes128_Sha256_RsaOaep' },
				{ name: 'Aes256_Sha256_RsaPss', value: 'Aes256_Sha256_RsaPss' },
			],
			default: 'None',
			description: 'Select the security policy for the connection.',
		},
		{
			displayName: 'Security Mode',
			name: 'securityMode',
			type: 'options',
			options: [
				{ name: 'None', value: 'None' },
				{ name: 'Sign', value: 'Sign' },
				{ name: 'Sign & Encrypt', value: 'SignAndEncrypt' },
			],
			default: 'None',
			description: 'Select the security mode for the connection.',
		},
		{
			displayName: 'Authentication Type',
			name: 'authenticationType',
			type: 'options',
			options: [
				{ name: 'Anonymous', value: 'anonymous' },
				{ name: 'Username/Password', value: 'usernamePassword' },
				{ name: 'X509 Certificate', value: 'x509' },
			],
			default: 'anonymous',
			description: 'Choose the authentication method.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'The username for authentication.',
			displayOptions: {
				show: {
					authenticationType: ['usernamePassword'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The password for authentication.',
			displayOptions: {
				show: {
					authenticationType: ['usernamePassword'],
				},
			},
		},
		{
			displayName: 'Certificate (PEM)',
			name: 'certificate',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			description: 'Paste the PEM-encoded X509 certificate.',
			displayOptions: {
				show: {
					authenticationType: ['x509'],
				},
			},
		},
		{
			displayName: 'Private Key (PEM)',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			description: 'Paste the PEM-encoded private key for the certificate.',
			displayOptions: {
				show: {
					authenticationType: ['x509'],
				},
			},
		},
	];

	test: ICredentialTestRequest = {
		test: async function (this: ICredentialTestFunctions, credential: any): Promise<INodeCredentialTestResult> {
			try {
				const { OPCUAClient, SecurityPolicy, MessageSecurityMode, UserTokenType } = await import('node-opcua');
				const endpointUrl = credential.endpointUrl as string;
				const securityPolicy = (credential.securityPolicy as string) || 'None';
				const securityMode = (credential.securityMode as string) || 'None';
				const authenticationType = (credential.authenticationType as string) || 'anonymous';

				let securityPolicyEnum;
				let securityModeEnum;
				switch (securityPolicy) {
					case 'Basic256Sha256': securityPolicyEnum = SecurityPolicy.Basic256Sha256; break;
					case 'Basic256': securityPolicyEnum = SecurityPolicy.Basic256; break;
					case 'Basic128Rsa15': securityPolicyEnum = SecurityPolicy.Basic128Rsa15; break;
					case 'Aes128_Sha256_RsaOaep': securityPolicyEnum = SecurityPolicy.Aes128_Sha256_RsaOaep; break;
					case 'Aes256_Sha256_RsaPss': securityPolicyEnum = SecurityPolicy.Aes256_Sha256_RsaPss; break;
					default: securityPolicyEnum = SecurityPolicy.None;
				}
				switch (securityMode) {
					case 'Sign': securityModeEnum = MessageSecurityMode.Sign; break;
					case 'SignAndEncrypt':
					case 'Sign & Encrypt': securityModeEnum = MessageSecurityMode.SignAndEncrypt; break;
					default: securityModeEnum = MessageSecurityMode.None;
				}
				const clientOptions: any = {
					securityPolicy: securityPolicyEnum,
					securityMode: securityModeEnum,
					connectionStrategy: { initialDelay: 1000, maxRetry: 1, maxDelay: 5000 },
					clientName: 'n8n-opcua-credential-test',
					requestedSessionTimeout: 10000,
					endpointMustExist: false,
					securityOptions: { rejectUnauthorized: false },
				};
				if (authenticationType === 'x509') {
					if (credential.certificate && credential.privateKey) {
						clientOptions.certificateData = Buffer.from(credential.certificate as string);
						clientOptions.privateKeyData = Buffer.from(credential.privateKey as string);
					} else {
						return { status: 'Error', message: 'X509 authentication requires both certificate and private key.' };
					}
				}
				const client = OPCUAClient.create(clientOptions);
				let session;
				try {
					await client.connect(endpointUrl);
					let userIdentity: any;
					if (authenticationType === 'usernamePassword') {
						userIdentity = {
							type: UserTokenType.UserName,
							userName: credential.username,
							password: credential.password,
						};
					} else if (authenticationType === 'x509') {
						userIdentity = {
							type: UserTokenType.Certificate,
							certificateData: credential.certificate,
							privateKey: credential.privateKey,
						};
					} else {
						userIdentity = undefined;
					}
					session = await client.createSession(userIdentity);
					await session.close();
					await client.disconnect();
					return { status: 'OK', message: 'Successfully connected to OPC UA server.' };
				} catch (error: any) {
					await client.disconnect().catch(() => {});
					return { status: 'Error', message: error?.message || 'Failed to connect or authenticate to OPC UA server.' };
				}
			} catch (error: any) {
				return { status: 'Error', message: error?.message || 'Unexpected error during OPC UA connection test.' };
			}
		},
	};
}
