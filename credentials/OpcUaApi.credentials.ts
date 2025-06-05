import {
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class OpcUaApi implements ICredentialType {
	name = 'opcUaApi';
	displayName = 'OPC UA API';
	documentationUrl = 'https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/blob/main/docs/opcua-credential.md';
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
			description: 'The password for authentication',
			type: 'string',
			default: '',
			typeOptions: { password: true },
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
				password: true,
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
}
