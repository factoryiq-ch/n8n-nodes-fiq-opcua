#!/usr/bin/env node
/**
 * Efficient OPC UA Vendor Bundling Script
 * Creates a single, optimized bundle from node-opcua client functionality
 * Compliant with n8n verification guidelines (no external dependencies)
 */

const path = require('path');
const fs = require('fs');

// Resolve paths relative to this script's location
const PROJECT_DIR = path.resolve(__dirname, '..');
const esbuild = require(path.join(PROJECT_DIR, 'node_modules/esbuild'));

const VENDOR_DIR = path.resolve(PROJECT_DIR, 'vendor');
const TEMP_ENTRY = path.resolve(__dirname, 'temp-opcua-entry.js');

console.log('🚀 Starting efficient OPC UA bundling...');
console.log(`📁 Project directory: ${PROJECT_DIR}`);

// Step 1: Clean vendor directory
console.log('🧹 Cleaning vendor directory...');
if (fs.existsSync(VENDOR_DIR)) {
  fs.rmSync(VENDOR_DIR, { recursive: true, force: true });
}
fs.mkdirSync(VENDOR_DIR, { recursive: true });

// Step 2: Create temporary entry file that exports what we need
console.log('📝 Creating bundle entry point...');
const entryContent = `
// OPC UA Client Bundle Entry Point
// Exports only what we need for n8n node functionality

export {
  OPCUAClient,
  SecurityPolicy,
  MessageSecurityMode,
  UserTokenType,
  DataType,
  AttributeIds,
  StatusCodes,
  TimestampsToReturn,
  ClientSession,
  ClientSubscription,
  ReadValueIdOptions,
  WriteValueOptions,
  CallMethodRequestOptions,
  NodeId,
  Variant,
  DataValue,
  QualifiedName,
  LocalizedText,
  // Connection and session management
  ClientMonitoredItem,
  MonitoringParametersOptions,
  // Data types and values
  VariantArrayType,
  // Status and results
  StatusCode,
  ReadResult,
  WriteResult,
  CallMethodResult
} from 'node-opcua';
`;

fs.writeFileSync(TEMP_ENTRY, entryContent);

// Step 3: Bundle with esbuild
console.log('📦 Bundling with ESBuild...');

async function bundle() {
  try {
    await esbuild.build({
      entryPoints: [TEMP_ENTRY],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(VENDOR_DIR, 'opcua-client.js'),
      external: [
        // Keep these as external (they're Node.js built-ins or common deps)
        'fs', 'path', 'crypto', 'net', 'tls', 'events', 'stream', 'util', 'buffer',
        'os', 'child_process', 'dgram', 'dns', 'http', 'https', 'url', 'zlib'
      ],
      minify: false, // Keep readable for debugging
      sourcemap: false,
      treeShaking: true,
      metafile: false,
      logLevel: 'info',
      // Set the working directory to the project dir for correct module resolution
      absWorkingDir: PROJECT_DIR
    });

    console.log('✅ Bundle created successfully!');
  } catch (error) {
    console.error('❌ Bundling failed:', error);
    process.exit(1);
  }
}

// Step 4: Create TypeScript definitions
console.log('📋 Creating TypeScript definitions...');
const typeDefinitions = `
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
`;

fs.writeFileSync(path.join(VENDOR_DIR, 'opcua-client.d.ts'), typeDefinitions);

// Step 5: Create vendor index
console.log('🔗 Creating vendor index...');
const vendorIndex = `
// Vendor Index - Clean interface to bundled OPC UA client
module.exports = require('./opcua-client.js');
`;

const vendorIndexTypes = `
// Vendor Index Types
export * from './opcua-client';
`;

fs.writeFileSync(path.join(VENDOR_DIR, 'index.js'), vendorIndex);
fs.writeFileSync(path.join(VENDOR_DIR, 'index.d.ts'), vendorIndexTypes);

// Step 6: Run the bundle process
bundle().then(() => {
  // Clean up temporary file
  fs.unlinkSync(TEMP_ENTRY);

  // Get bundle size
  const bundleStats = fs.statSync(path.join(VENDOR_DIR, 'opcua-client.js'));
  const bundleSizeKB = Math.round(bundleStats.size / 1024);

  console.log('✨ Vendoring complete!');
  console.log(`📊 Bundle size: ${bundleSizeKB} KB`);
  console.log(`📁 Vendor directory: ${VENDOR_DIR}`);
  console.log('🎯 Ready for n8n verification (no external dependencies)');

  console.log('🏗️  Next steps:');
  console.log('   1. Run: npm run build');
  console.log('   2. Test the node functionality');
  console.log('   3. Run: npx @n8n/scan-community-package .');
}).catch(error => {
  console.error('❌ Process failed:', error);
  // Clean up temporary file even on error
  if (fs.existsSync(TEMP_ENTRY)) {
    fs.unlinkSync(TEMP_ENTRY);
  }
  process.exit(1);
});
