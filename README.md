[![CI](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/actions/workflows/ci.yml/badge.svg)](https://github.com/factoryiq-ch/n8n-nodes-fiq-opcua/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/factoryiq-ch/n8n-nodes-fiq-opcua/branch/main/graph/badge.svg)](https://codecov.io/gh/factoryiq-ch/n8n-nodes-fiq-opcua)

<p align="center">
  <img src="icons/FactoryIQ.svg" alt="FactoryIQ Logo" width="200"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/coverage-80%25-brightgreen" alt="Test Coverage"/>
</p>

# n8n-nodes-fiq-opcua

**FactoryIQ OPC UA Node for n8n**

This n8n community node allows you to connect to OPC UA servers to read and write industrial data, supporting both secure and anonymous connections. Built and maintained by FactoryIQ.

---

## Features

- Read data from one or more OPC UA nodes
- Write values to OPC UA nodes
- Call OPC UA methods
- Supports all standard OPC UA security policies and authentication modes

---

## Installation

1. Install this node in your n8n instance:
   ```bash
   npm install n8n-nodes-fiq-opcua
   ```
2. Restart n8n.

---

## Node Parameters

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

## License

MIT

---

## Maintainer

[FactoryIQ](https://factoryiq.ch)

---

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/#community-nodes)
- [OPC UA Specification](https://opcfoundation.org/about/opc-technologies/opc-ua/)
