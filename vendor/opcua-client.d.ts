
// Auto-generated OPC UA Client Type Definitions
// Based on node-opcua client functionality

export interface OPCUAClientOptions {
  endpointUrl?: string;
  securityPolicy?: any;
  securityMode?: any;
  connectionStrategy?: {
    initialDelay?: number;
    maxRetry?: number;
    maxDelay?: number;
  };
  clientName?: string;
  requestedSessionTimeout?: number;
  endpointMustExist?: boolean;
  securityOptions?: {
    rejectUnauthorized?: boolean;
  };
  certificateData?: Buffer;
  privateKeyData?: Buffer;
}

export interface UserIdentity {
  type: any;
  userName?: string;
  password?: string;
  certificateData?: any;
  privateKey?: any;
}

export interface ReadValueId {
  nodeId: string;
  attributeId: number;
}

export interface WriteValue {
  nodeId: string;
  attributeId: number;
  value: {
    value: {
      dataType: number;
      value: any;
    };
  };
}

export interface MethodCall {
  objectId: string;
  methodId: string;
  inputArguments?: any[];
}

export interface ReadResult {
  statusCode?: {
    name?: string;
    toString(): string;
  };
  value?: {
    value: any;
    dataType: number | string;
  };
}

export interface WriteResult {
  name?: string;
  toString(): string;
}

export interface CallMethodResult {
  statusCode?: {
    name?: string;
    toString(): string;
  };
  outputArguments?: any[];
}

export declare class OPCUAClient {
  static create(options: OPCUAClientOptions): OPCUAClient;
  connect(endpointUrl: string): Promise<void>;
  disconnect(): Promise<void>;
  createSession(userIdentity?: UserIdentity): Promise<ClientSession>;
}

export declare class ClientSession {
  read(nodesToRead: ReadValueId[]): Promise<ReadResult[]>;
  write(nodesToWrite: WriteValue[]): Promise<WriteResult[]>;
  call(methodsToCall: MethodCall[]): Promise<CallMethodResult[]>;
  close(): Promise<void>;
}

export declare const SecurityPolicy: {
  None: any;
  Basic128Rsa15: any;
  Basic256: any;
  Basic256Sha256: any;
  Aes128_Sha256_RsaOaep: any;
  Aes256_Sha256_RsaPss: any;
};

export declare const MessageSecurityMode: {
  None: any;
  Sign: any;
  SignAndEncrypt: any;
};

export declare const UserTokenType: {
  Anonymous: any;
  UserName: any;
  Certificate: any;
};

export declare const DataType: {
  Boolean: number;
  SByte: number;
  Byte: number;
  Int16: number;
  UInt16: number;
  Int32: number;
  UInt32: number;
  Int64: number;
  UInt64: number;
  Float: number;
  Double: number;
  String: number;
  DateTime: number;
  Guid: number;
  ByteString: number;
};

export declare const AttributeIds: {
  Value: number;
};

export declare const StatusCodes: any;
