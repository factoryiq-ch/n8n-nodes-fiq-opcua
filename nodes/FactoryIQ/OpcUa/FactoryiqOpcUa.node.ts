import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	Icon,
	IDataObject,
	INodeCredentialTestResult,
	ICredentialTestFunctions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, ApplicationError } from 'n8n-workflow';
import type { FactoryIQNodeOutput } from './FactoryIQNodeOutput';
import {
	DataType,
	AttributeIds
} from '../../../vendor';
import { OpcUaConnectionPool } from './ConnectionPool';

interface OpcUaCredential {
	endpointUrl: string;
	securityPolicy?: string;
	securityMode?: string;
	authenticationType?: string;
	username?: string;
	password?: string;
	certificate?: string;
	privateKey?: string;
}

export class FactoryiqOpcUa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FactoryIQ OpcUA',
		name: 'factoryiqOpcUa',
		group: ['input', 'output'],
		version: 1,
		description: 'Read and write data to OPC UA servers',
		icon: 'file:FactoryIQ.svg' as Icon,
		defaults: {
			name: 'OPC UA',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'opcUaCredentialsApi',
				required: true,
				testedBy: 'opcuaConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'Read', value: 'read' },
					{ name: 'Write', value: 'write' },
				],
				default: 'read',
				description: 'Choose whether to read or write OPC UA data',
				noDataExpression: true,
			},
			{
				displayName: 'Node IDs',
				name: 'nodeIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add NodeId',
				},
				default: [],
				placeholder: 'e.g. ns=1;s=Temperature',
				description: 'Add one or more OPC UA nodeIds to read. Each nodeId should be entered as a separate entry (e.g., ns=1;s=Temperature).',
				displayOptions: {
					show: {
						operation: ['read'],
					},
				},
			},
			{
				displayName: 'Write Operation',
				name: 'writeOperation',
				type: 'options',
				options: [
					{ name: 'Write Variable', value: 'writeVariable' },
					{ name: 'Call Method', value: 'callMethod' },
				],
				default: 'writeVariable',
				description: 'Choose whether to write to a variable or call a method',
				displayOptions: {
					show: {
						operation: ['write'],
					},
				},
				noDataExpression: true,
			},
			{
				displayName: 'Node ID',
				name: 'nodeId',
				type: 'string',
				displayOptions: { show: { operation: ['write'], writeOperation: ['writeVariable'] } },
				required: true,
				description: 'The OPC UA nodeId of the variable to write to',
				default: '',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				displayOptions: { show: { operation: ['write'], writeOperation: ['writeVariable'] } },
				required: true,
				description: 'The value to write',
				default: '',
			},
			{
				displayName: 'Data Type',
				name: 'dataType',
				type: 'options',
				displayOptions: { show: { operation: ['write'], writeOperation: ['writeVariable'] } },
				options: [
					{ name: 'Boolean', value: 'Boolean' },
					{ name: 'Byte', value: 'Byte' },
					{ name: 'ByteString', value: 'ByteString' },
					{ name: 'DateTime', value: 'DateTime' },
					{ name: 'Double', value: 'Double' },
					{ name: 'Float', value: 'Float' },
					{ name: 'Guid', value: 'Guid' },
					{ name: 'Int16', value: 'Int16' },
					{ name: 'Int32', value: 'Int32' },
					{ name: 'Int64', value: 'Int64' },
					{ name: 'SByte', value: 'SByte' },
					{ name: 'String', value: 'String' },
					{ name: 'UInt16', value: 'UInt16' },
					{ name: 'UInt32', value: 'UInt32' },
					{ name: 'UInt64', value: 'UInt64' },
				],
				required: true,
				description: 'The OPC UA data type of the value',
				default: 'Boolean',
			},
			{
				displayName: 'Object Node ID',
				name: 'objectNodeId',
				type: 'string',
				displayOptions: { show: { operation: ['write'], writeOperation: ['callMethod'] } },
				required: true,
				description: 'The nodeId of the object containing the method',
				default: '',
			},
			{
				displayName: 'Method Node ID',
				name: 'methodNodeId',
				type: 'string',
				displayOptions: { show: { operation: ['write'], writeOperation: ['callMethod'] } },
				required: true,
				description: 'The nodeId of the method to call',
				default: '',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'fixedCollection',
				displayOptions: { show: { operation: ['write'], writeOperation: ['callMethod'] } },
				description: 'Optional. Add input arguments for the method call. Leave empty for methods with no input arguments.',
				default: {},
				options: [
					{
						displayName: 'Argument',
						name: 'argument',
						type: 'collection',
						placeholder: 'Add Argument',
						default: {},
						options: [
							{
								displayName: 'Data Type',
								name: 'dataType',
								type: 'options',
								options: [
									{ name: 'Boolean', value: 'Boolean' },
									{ name: 'Byte', value: 'Byte' },
									{ name: 'ByteString', value: 'ByteString' },
									{ name: 'DateTime', value: 'DateTime' },
									{ name: 'Double', value: 'Double' },
									{ name: 'Float', value: 'Float' },
									{ name: 'Guid', value: 'Guid' },
									{ name: 'Int16', value: 'Int16' },
									{ name: 'Int32', value: 'Int32' },
									{ name: 'Int64', value: 'Int64' },
									{ name: 'SByte', value: 'SByte' },
									{ name: 'String', value: 'String' },
									{ name: 'UInt16', value: 'UInt16' },
									{ name: 'UInt32', value: 'UInt32' },
									{ name: 'UInt64', value: 'UInt64' },
								],
								default: 'String',
								description: 'The OPC UA data type of the argument',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value for this argument',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async opcuaConnectionTest(this: ICredentialTestFunctions, credential: any): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as OpcUaCredential;
				if (!credentials) {
					return {
						status: 'Error',
						message: 'No credentials provided.',
					};
				}

				let client;
				try {
					const { OPCUAClient, SecurityPolicy, MessageSecurityMode, UserTokenType } = require('../../../vendor');
					const endpointUrl = credentials.endpointUrl as string;

					// Validate endpoint URL
					if (!endpointUrl || typeof endpointUrl !== 'string' || endpointUrl.trim() === '') {
						return {
							status: 'Error',
							message: 'Endpoint URL is required and cannot be empty.',
						};
					}

					// Validate URL format
					if (!endpointUrl.startsWith('opc.tcp://') && !endpointUrl.startsWith('opc.https://')) {
						return {
							status: 'Error',
							message: `Endpoint URL must start with opc.tcp:// or opc.https://. Received: "${endpointUrl}"`,
						};
					}

					const securityPolicy = credentials.securityPolicy || 'None';
					const securityMode = credentials.securityMode || 'None';
					const authenticationType = credentials.authenticationType || 'anonymous';

					let securityPolicyEnum = SecurityPolicy.None;
					let securityModeEnum = MessageSecurityMode.None;
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
						connectionStrategy: { initialDelay: 1000, maxRetry: 1, maxDelay: 2000 },
						clientName: 'n8n-opcua-credential-test',
						requestedSessionTimeout: 10000,
						endpointMustExist: false,
						securityOptions: { rejectUnauthorized: false },
					};
					if (authenticationType === 'x509') {
						if (credentials.certificate && credentials.privateKey) {
							clientOptions.certificateData = Buffer.from(String(credentials.certificate));
							clientOptions.privateKeyData = Buffer.from(String(credentials.privateKey));
						} else {
							throw new ApplicationError('X509 authentication requires both certificate and private key.');
						}
					}
					client = OPCUAClient.create(clientOptions);
					await client.connect(endpointUrl);
					let userIdentity;
					if (authenticationType === 'usernamePassword') {
						userIdentity = {
							type: UserTokenType.UserName,
							userName: credentials.username,
							password: credentials.password,
						};
					} else if (authenticationType === 'x509') {
						userIdentity = {
							type: UserTokenType.Certificate,
							certificateData: String(credentials.certificate),
							privateKey: String(credentials.privateKey),
						};
					} else {
						userIdentity = undefined;
					}
					const session = await client.createSession(userIdentity);
					await session.close();
					await client.disconnect();
				} catch (e: any) {
					if (client) {
						try {
							await client.disconnect();
						} catch {}
					}
					return {
						status: 'Error',
						message: e.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'read') {
			const nodeIdsRaw = this.getNodeParameter('nodeIds', 0, []) as string[] | string;
			const nodeIds = Array.isArray(nodeIdsRaw) ? nodeIdsRaw : [nodeIdsRaw];
			if (!Array.isArray(nodeIds) || nodeIds.length === 0 || !nodeIds[0]) {
				throw new NodeOperationError(this.getNode(), 'At least one Node ID must be provided for reading.');
			}
			const credentials = await this.getCredentials('opcUaCredentialsApi');
			if (!credentials) {
				throw new NodeOperationError(this.getNode(), 'No OPC UA credentials provided.');
			}
			const authenticationType = (credentials.authenticationType as string) || 'anonymous';
			if (authenticationType === 'x509' && (!credentials.certificate || !credentials.privateKey)) {
				throw new NodeOperationError(this.getNode(), 'X509 authentication requires both certificate and private key.');
			}

			// Get pooled connection
			let client: any, session: any, pooledConnection: any;
			try {
				const pool = OpcUaConnectionPool.getInstance();
				pooledConnection = await pool.getConnection(credentials);
				client = pooledConnection.client;
				session = pooledConnection.session;
			} catch (error) {
				// Pool failed, fall back to direct connection (current behavior)
				throw new NodeOperationError(this.getNode(), error, { message: 'Failed to connect or authenticate to OPC UA server.' });
			}
			const clientName = pooledConnection ? `n8n-opcua-pool` : `n8n-opcua-${Math.random().toString(36).substring(2, 10)}`;

			try {
				const nodesToRead = nodeIds.map(nodeId => ({
					nodeId,
					attributeId: AttributeIds.Value,
				}));
				const readResults = await session.read(nodesToRead);

								// Create consolidated output for multiple node IDs
				const metrics: Record<string, any> = {};
				const metaDataTypes: Record<string, any> = {};
				const errors: Record<string, string> = {};
				let overallStatus = 'Good';
				const timestamp = Date.now();

				for (let i = 0; i < nodeIds.length; i++) {
					const nodeId = nodeIds[i];
					const result = readResults[i];

					if (result.statusCode && result.statusCode.name !== 'Good') {
						metrics[nodeId] = null;
						errors[nodeId] = result.statusCode.name;
						// For single node, use the actual error status; for multiple nodes, use 'Partial'
						overallStatus = nodeIds.length === 1 ? result.statusCode.name : 'Partial';
					} else {
						metrics[nodeId] = result.value ? result.value.value : null;
						if (result.value && typeof result.value.dataType === 'number' && FactoryiqOpcUa.opcuaDataTypeMap[result.value.dataType] !== undefined) {
							metaDataTypes[nodeId] = FactoryiqOpcUa.opcuaDataTypeMap[result.value.dataType];
						}
					}
				}

				// Create single consolidated output
				const output: FactoryIQNodeOutput = {
					timestamp,
					source: clientName,
					protocol: 'opcua',
					address: nodeIds.length === 1 ? nodeIds[0] : `${nodeIds.length} nodes`,
					metrics,
					status: overallStatus,
					meta: nodeIds.length === 1
						? {
							// For single node, maintain backward compatibility
							dataType: metaDataTypes[nodeIds[0]] || null,
							...(Object.keys(errors).length > 0 && { error: errors[nodeIds[0]] })
						}
						: {
							// For multiple nodes, use new key-value structure
							dataTypes: metaDataTypes,
							...(Object.keys(errors).length > 0 && { errors }),
							nodeCount: nodeIds.length,
							nodeIds: nodeIds
						},
				};

				results.push({ json: output as unknown as IDataObject });
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error, { message: 'Failed to read node values.' });
			} finally {
				if (pooledConnection) {
					// Release connection back to pool
					const pool = OpcUaConnectionPool.getInstance();
					pool.releaseConnection(pooledConnection);
				} else {
					// Direct connection - clean up as before
					try {
						if (session) {
							await session.close();
						}
						await client.disconnect();
					} catch (error) {}
				}
			}
			return [results];
		} else if (operation === 'write') {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const writeOperation = this.getNodeParameter('writeOperation', itemIndex) as string | undefined;
				if (!writeOperation) {
					throw new NodeOperationError(this.getNode(), 'Write operation must be specified.');
				}
				if (writeOperation === 'writeVariable') {
					const nodeId = this.getNodeParameter('nodeId', itemIndex) as string;
					const dataType = this.getNodeParameter('dataType', itemIndex) as string;
					if (!nodeId || !dataType) {
						throw new NodeOperationError(this.getNode(), 'Node ID and Data Type are required for variable write.');
					}
				} else if (writeOperation === 'callMethod') {
					// No required params for callMethod at this stage
				} else {
					throw new NodeOperationError(this.getNode(), 'Unsupported operation type.');
				}
				const credentials = await this.getCredentials('opcUaCredentialsApi');
				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No OPC UA credentials provided.');
				}
				const authenticationType = (credentials.authenticationType as string) || 'anonymous';
				if (authenticationType === 'x509' && (!credentials.certificate || !credentials.privateKey)) {
					throw new NodeOperationError(this.getNode(), 'X509 authentication requires both certificate and private key.');
				}

				// Get pooled connection
				let client: any, session: any, pooledConnection: any;
				try {
					const pool = OpcUaConnectionPool.getInstance();
					pooledConnection = await pool.getConnection(credentials);
					client = pooledConnection.client;
					session = pooledConnection.session;
				} catch (error) {
					// Pool failed, fall back to direct connection (current behavior)
					throw new NodeOperationError(this.getNode(), error, { message: 'Failed to connect or authenticate to OPC UA server.' });
				}
				const clientName = pooledConnection ? `n8n-opcua-pool` : `n8n-opcua-${Math.random().toString(36).substring(2, 10)}`;

				try {
					if (writeOperation === 'writeVariable') {
						const nodeId = this.getNodeParameter('nodeId', itemIndex) as string;
						const value = this.getNodeParameter('value', itemIndex) as string;
						const dataType = this.getNodeParameter('dataType', itemIndex) as string;
						const dataTypeEnum = FactoryiqOpcUa.getDataTypeEnum(dataType);
						const writeValue = FactoryiqOpcUa.convertValueToDataType(value, dataType);
						const nodesToWrite = [{
							nodeId,
							attributeId: AttributeIds.Value,
							value: {
								value: { dataType: dataTypeEnum, value: writeValue },
							},
						}];
						const operationResult = await session.write(nodesToWrite);
						const output: FactoryIQNodeOutput = {
							timestamp: Date.now(),
							source: clientName,
							protocol: 'opcua',
							address: nodeId,
							metrics: { [nodeId]: writeValue },
							status: (operationResult[0]?.name || operationResult[0]?.toString()) === 'Good' ? 'ok' : 'error',
							meta: { dataType: (typeof dataTypeEnum === 'number' && FactoryiqOpcUa.opcuaDataTypeMap[dataTypeEnum] !== undefined) ? FactoryiqOpcUa.opcuaDataTypeMap[dataTypeEnum] : null, operationType: 'variable_write', statusCode: operationResult[0]?.name || operationResult[0]?.toString() },
						};
						results.push({ json: output as unknown as IDataObject });
					} else if (writeOperation === 'callMethod') {
						const objectNodeId = this.getNodeParameter('objectNodeId', itemIndex) as string;
						const methodNodeId = this.getNodeParameter('methodNodeId', itemIndex) as string;
						const parametersRaw = this.getNodeParameter('parameters', itemIndex, {});
						let inputArguments: any[] = [];
						if (
							parametersRaw &&
							typeof parametersRaw === 'object' &&
							'arguments' in parametersRaw &&
							Array.isArray((parametersRaw as any).arguments)
						) {
							inputArguments = (parametersRaw as any).arguments.map((arg: any) => ({
								dataType: arg.dataType,
								value: arg.value,
							}));
						}
						const methodCall = [{
							objectId: objectNodeId,
							methodId: methodNodeId,
							inputArguments,
						}];
						const operationResult = await session.call(methodCall);
						const output: FactoryIQNodeOutput = {
							timestamp: Date.now(),
							source: clientName,
							protocol: 'opcua',
							address: methodNodeId,
							metrics: { outputArguments: operationResult[0]?.outputArguments || [] },
							status: (operationResult[0]?.statusCode?.name || operationResult[0]?.statusCode?.toString()) === 'Good' ? 'ok' : 'error',
							meta: { inputArguments, operationType: 'method_call', statusCode: operationResult[0]?.statusCode?.name || operationResult[0]?.statusCode?.toString() },
						};
						results.push({ json: output as unknown as IDataObject });
					} else {
						throw new NodeOperationError(this.getNode(), 'Unsupported operation type.');
					}
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error, { message: 'Failed to execute operation on OPC UA node.' });
				} finally {
					if (pooledConnection) {
						// Release connection back to pool
						const pool = OpcUaConnectionPool.getInstance();
						pool.releaseConnection(pooledConnection);
					} else {
						// Direct connection - clean up as before
						try {
							if (session) {
								await session.close();
							}
							await client.disconnect();
						} catch (error) {}
					}
				}
			}
			return [results];
		} else {
			throw new NodeOperationError(this.getNode(), 'Invalid operation selected.');
		}
	}

	private static getDataTypeEnum(dataType: string): number {
		switch (dataType) {
			case 'Boolean': return DataType.Boolean;
			case 'SByte': return DataType.SByte;
			case 'Byte': return DataType.Byte;
			case 'Int16': return DataType.Int16;
			case 'UInt16': return DataType.UInt16;
			case 'Int32': return DataType.Int32;
			case 'UInt32': return DataType.UInt32;
			case 'Int64': return DataType.Int64;
			case 'UInt64': return DataType.UInt64;
			case 'Float': return DataType.Float;
			case 'Double': return DataType.Double;
			case 'String': return DataType.String;
			case 'DateTime': return DataType.DateTime;
			case 'Guid': return DataType.Guid;
			case 'ByteString': return DataType.ByteString;
			default: return DataType.String;
		}
	}

	private static convertValueToDataType(value: string, dataType: string): any {
		switch (dataType) {
			case 'Boolean':
				return value.toString().toLowerCase() === 'true' || value === '1' || value.toString().toLowerCase() === 'on' || value.toString().toLowerCase() === 'yes';
			case 'SByte':
				return Math.max(-128, Math.min(127, parseInt(value) || 0));
			case 'Byte':
				return Math.max(0, Math.min(255, parseInt(value) || 0));
			case 'Int16':
				return Math.max(-32768, Math.min(32767, parseInt(value) || 0));
			case 'UInt16':
				return Math.max(0, Math.min(65535, parseInt(value) || 0));
			case 'Int32':
				return Math.max(-2147483648, Math.min(2147483647, parseInt(value) || 0));
			case 'UInt32':
				return Math.max(0, Math.min(4294967295, parseInt(value) || 0));
			case 'Int64':
				return parseInt(value) || 0;
			case 'UInt64':
				return Math.max(0, parseInt(value) || 0);
			case 'Float':
				return parseFloat(value) || 0.0;
			case 'Double':
				return parseFloat(value) || 0.0;
			case 'String':
				return value.toString();
			case 'DateTime':
				return new Date(value);
			case 'Guid':
				return value.toString();
			case 'ByteString':
				return Buffer.from(value);
			default:
				return value.toString();
		}
	}

	// Add a static mapping for OPC UA DataType numbers to string names
	private static opcuaDataTypeMap: Record<number, string> = {
		0: 'Null',
		1: 'Boolean',
		2: 'SByte',
		3: 'Byte',
		4: 'Int16',
		5: 'UInt16',
		6: 'Int32',
		7: 'UInt32',
		8: 'Int64',
		9: 'UInt64',
		10: 'Float',
		11: 'Double',
		12: 'String',
		13: 'DateTime',
		14: 'Guid',
		15: 'ByteString',
		16: 'XmlElement',
		17: 'NodeId',
		18: 'ExpandedNodeId',
		19: 'StatusCode',
		20: 'QualifiedName',
		21: 'LocalizedText',
		22: 'ExtensionObject',
		23: 'DataValue',
		24: 'Variant',
		25: 'DiagnosticInfo',
	};
}
