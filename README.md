[![CI](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/actions/workflows/ci.yml/badge.svg)](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/factoryiq-ch/n8n-nodes-fiq-opcua/branch/main/graph/badge.svg?token=GOATJAVAM0)](https://codecov.io/gh/factoryiq-ch/n8n-nodes-fiq-opcua)
[![npm version](https://img.shields.io/npm/v/@fiqch/n8n-nodes-fiq-opcua.svg)](https://www.npmjs.com/package/@fiqch/n8n-nodes-fiq-opcua)
[![GitHub release](https://img.shields.io/github/v/release/factoryiq-ch/n8n-nodes-fiq-opcua)](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/releases)

<p align="center">
  <img src="icons/FactoryIQ.svg" alt="FactoryIQ Logo" width="200"/>
</p>

# n8n-nodes-fiq-opcua

**FactoryIQ OPC UA Node for n8n**

This n8n community node allows you to connect to OPC UA servers to read and write industrial data, supporting both secure and anonymous connections. Built and maintained by FactoryIQ.

---

## 🚀 Quick Start

### Installation

Install as a standard n8n custom node package:

```bash
npm install @fiqch/n8n-nodes-fiq-opcua
```

For detailed instructions on installing community nodes in n8n, see the official n8n documentation: [Install and manage community nodes](https://docs.n8n.io/integrations/community-nodes/installation/)

### Usage

Import and use this custom node in your n8n instance. See the [n8n documentation](https://docs.n8n.io/) for details on using custom nodes.

---

## Features

- Read data from one or more OPC UA nodes
- Write values to OPC UA nodes
- Call OPC UA methods
- Supports all standard OPC UA security policies and authentication modes

---

## Configuration

### Credentials

- **Endpoint URL**: OPC UA server endpoint (e.g., `opc.tcp://localhost:4840`)
- **Security Policy**: None, Basic128Rsa15, Basic256, Basic256Sha256, etc.
- **Security Mode**: None, Sign, Sign & Encrypt
- **Authentication Type**: Anonymous, Username/Password, X509 Certificate

### Node Options

- **Mode**: Reader or Writer
- **Node IDs**: (Reader) List of node IDs to read
- **Operation**: (Writer) Write Variable or Call Method
- **Node ID**: (Writer) Node ID to write to
- **Value**: (Writer) Value to write
- **Data Type**: (Writer) Data type of the value
- **Object Node ID**: (Writer, Call Method) Node ID of the object
- **Method Node ID**: (Writer, Call Method) Node ID of the method
- **Parameters**: (Writer, Call Method) Input arguments for the method

---

## Troubleshooting

- If you encounter issues related to OPC UA client functionality, ensure the vendor directory is up to date and only contains the minimal required files.
- For TypeScript errors, check that `vendor/index.d.ts` matches the current exports.

---

## Development

- Clone the repository
- Install dependencies: `npm install`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm run test`

---

## Compatibility

| Package         | Version    | Link                                                      |
|----------------|------------|-----------------------------------------------------------|
| n8n            | 1.95.3     | [npm](https://www.npmjs.com/package/n8n)                  |
| n8n-workflow   | 1.82.0     | [npm](https://www.npmjs.com/package/n8n-workflow)         |
| Node.js        | 18.17.0    | [nodejs.org](https://nodejs.org/)                         |
| Node.js (LTS)  | 20.14.0    | [nodejs.org](https://nodejs.org/)                         |
| Node.js (LTS)  | 22.16.0    | [nodejs.org](https://nodejs.org/)                         |

- This node is tested and supported on the above versions.
- Using other versions may result in unexpected behavior.

---

## Dependencies

This node requires the [`node-opcua`](https://github.com/node-opcua/node-opcua) library to communicate with OPC UA servers. No other runtime dependencies are included. This is in line with n8n community node standards for protocol nodes, where a protocol library is essential for functionality.

---

## Vendor Integration & Attribution

This package is fully self-contained and does not require the `node-opcua` package as an external dependency. Instead, select client-side functionalities from the [node-opcua](https://github.com/node-opcua/node-opcua) project ([npm](https://www.npmjs.com/package/node-opcua)) are included in a minimal vendor directory for compatibility and long-term maintainability.

### Vendor Directory Structure

- `vendor/index.js` – Minimal entry point, re-exporting only the OPC UA client symbols required by this package.
- `vendor/node-opcua/index.js` – Minimal client-only build of node-opcua, stripped of server code and unused features.
- `vendor/index.d.ts` – Minimal TypeScript declarations for vendor exports.

### Benefits of Self-Contained Approach
- **No external dependencies**: Reduces attack surface and simplifies deployment.
- **Smaller package size**: Only the required OPC UA client code is included.
- **Easier upgrades**: Vendor code can be updated in isolation (see [Upgrade Guide](docs/UPGRADE_VENDOR_OPCUA.md)).



---

## Resources

- [NPM Package](https://www.npmjs.com/package/@fiqch/n8n-nodes-fiq-opcua)
- [GitHub Releases](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/releases)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/#community-nodes)
- [OPC UA Specification](https://opcfoundation.org/about/opc-technologies/opc-ua/)

---

## License

MIT

---

## Maintainer

[FactoryIQ](https://factoryiq.ch)

---

## Acknowledgements

**Acknowledgement:**
- Portions of this package are derived from the open-source [node-opcua](https://github.com/node-opcua/node-opcua) project, which is licensed under the MIT License. We gratefully acknowledge the work of the node-opcua team.
