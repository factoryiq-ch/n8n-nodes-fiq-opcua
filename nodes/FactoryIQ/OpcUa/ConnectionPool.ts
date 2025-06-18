import {
	OPCUAClient,
	SecurityPolicy,
	MessageSecurityMode,
	UserTokenType,
} from '../../../vendor';

interface PooledConnection {
	client: any;
	session: any;
	inUse: boolean;
	key: string;
}

export class OpcUaConnectionPool {
	private static instance: OpcUaConnectionPool;
	private pools = new Map<string, PooledConnection[]>();

	private constructor() {}

	static getInstance(): OpcUaConnectionPool {
		if (!this.instance) {
			this.instance = new OpcUaConnectionPool();
		}
		return this.instance;
	}

	async getConnection(credentials: any): Promise<PooledConnection> {
		const key = this.createKey(credentials);
		let pool = this.pools.get(key) || [];

		// Find available connection
		for (const conn of pool) {
			if (!conn.inUse && conn.session && !conn.session.isReconnecting) {
				try {
					// Quick session validation
					if (conn.session.isChannelValid && conn.session.isChannelValid()) {
						conn.inUse = true;
						return conn;
					}
				} catch (error) {
					// Session invalid, remove from pool
					const index = pool.indexOf(conn);
					if (index > -1) {
						pool.splice(index, 1);
					}
				}
			}
		}

		// No available connection, create new (max 3 per credential)
		if (pool.length < 3) {
			try {
				const newConn = await this.createConnection(credentials, key);
				newConn.inUse = true;
				pool.push(newConn);
				this.pools.set(key, pool);
				return newConn;
			} catch (error) {
				// Creation failed, fall back to direct connection
				throw error;
			}
		}

		// Pool full, reuse first connection (mark as in use)
		const conn = pool[0];
		conn.inUse = true;
		return conn;
	}

	releaseConnection(connection: PooledConnection): void {
		if (connection) {
			connection.inUse = false;
		}
	}

	private createKey(credentials: any): string {
		const endpointUrl = credentials.endpointUrl as string;
		const authenticationType = (credentials.authenticationType as string) || 'anonymous';
		const username = credentials.username as string || '';
		return `${endpointUrl}|${authenticationType}|${username}`;
	}

	private async createConnection(credentials: any, key: string): Promise<PooledConnection> {
		const endpointUrl = credentials.endpointUrl as string;
		const securityPolicy = (credentials.securityPolicy as string) || 'None';
		const securityMode = (credentials.securityMode as string) || 'None';
		const authenticationType = (credentials.authenticationType as string) || 'anonymous';

		let securityPolicyEnum;
		let securityModeEnum;

		switch (securityPolicy) {
			case 'Basic256Sha256':
				securityPolicyEnum = SecurityPolicy.Basic256Sha256;
				break;
			case 'Basic256':
				securityPolicyEnum = SecurityPolicy.Basic256;
				break;
			case 'Basic128Rsa15':
				securityPolicyEnum = SecurityPolicy.Basic128Rsa15;
				break;
			case 'Aes128_Sha256_RsaOaep':
				securityPolicyEnum = SecurityPolicy.Aes128_Sha256_RsaOaep;
				break;
			case 'Aes256_Sha256_RsaPss':
				securityPolicyEnum = SecurityPolicy.Aes256_Sha256_RsaPss;
				break;
			default:
				securityPolicyEnum = SecurityPolicy.None;
		}

		switch (securityMode) {
			case 'Sign':
				securityModeEnum = MessageSecurityMode.Sign;
				break;
			case 'SignAndEncrypt':
			case 'Sign & Encrypt':
				securityModeEnum = MessageSecurityMode.SignAndEncrypt;
				break;
			default:
				securityModeEnum = MessageSecurityMode.None;
		}

		const randomSuffix = Math.random().toString(36).substring(2, 10);
		const clientName = `n8n-opcua-pool-${randomSuffix}`;
		const clientOptions: any = {
			securityPolicy: securityPolicyEnum,
			securityMode: securityModeEnum,
			connectionStrategy: {
				initialDelay: 1000,
				maxRetry: 3,
				maxDelay: 10000,
			},
			clientName,
			requestedSessionTimeout: 60000,
			endpointMustExist: false,
			securityOptions: {
				rejectUnauthorized: false
			}
		};

		if (authenticationType === 'x509') {
			if (credentials.certificate && credentials.privateKey) {
				clientOptions.certificateData = Buffer.from(credentials.certificate as string);
				clientOptions.privateKeyData = Buffer.from(credentials.privateKey as string);
			} else {
				throw new Error('X509 authentication requires both certificate and private key.');
			}
		}

		const client = OPCUAClient.create(clientOptions);
		await client.connect(endpointUrl);

		let userIdentity: any;
		if (authenticationType === 'usernamePassword') {
			userIdentity = {
				type: UserTokenType.UserName,
				userName: credentials.username,
				password: credentials.password,
			};
		} else if (authenticationType === 'x509') {
			userIdentity = {
				type: UserTokenType.Certificate,
				certificateData: credentials.certificate,
				privateKey: credentials.privateKey,
			};
		} else {
			userIdentity = undefined;
		}

		const session = await client.createSession(userIdentity);

		return {
			client,
			session,
			inUse: false,
			key
		};
	}

	// Cleanup method for graceful shutdown (optional)
	async shutdown(): Promise<void> {
		for (const pool of this.pools.values()) {
			for (const conn of pool) {
				try {
					if (conn.session) {
						await conn.session.close();
					}
					if (conn.client) {
						await conn.client.disconnect();
					}
				} catch (error) {
					// Ignore cleanup errors
				}
			}
		}
		this.pools.clear();
	}
}