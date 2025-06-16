# Upgrading Vendor OPC UA Components

This guide explains how to upgrade the vendored OPC UA components to a newer version of the `node-opcua` library.

## Overview

The vendor directory contains a minimal implementation that imports directly from the `node-opcua` package. This approach provides a clean separation between the n8n node implementation and the underlying OPC UA library.

## Current Implementation

The current vendor implementation is minimal and straightforward:

```javascript
// vendor/index.js
const opcua = require('node-opcua');

module.exports = {
  OPCUAClient: opcua.OPCUAClient,
  SecurityPolicy: opcua.SecurityPolicy,
  MessageSecurityMode: opcua.MessageSecurityMode,
  UserTokenType: opcua.UserTokenType,
  AttributeIds: opcua.AttributeIds,
  DataType: opcua.DataType,
};
```

## Upgrade Process

### 1. Update Package Dependency

Update the `node-opcua` version in `package.json`:

```bash
npm install node-opcua@^2.xxx.x
```

### 2. Test Compatibility

Run the test suite to ensure compatibility:

```bash
npm test
```

### 3. Check for Breaking Changes

Review the `node-opcua` changelog for any breaking changes that might affect the exported components:

- OPCUAClient API changes
- SecurityPolicy enum changes
- MessageSecurityMode enum changes
- UserTokenType enum changes
- AttributeIds enum changes
- DataType enum changes

### 4. Update Vendor Exports (if needed)

If the `node-opcua` API has changed, update the vendor exports in `vendor/index.js` accordingly.

### 5. Update Type Definitions (if needed)

If TypeScript definitions have changed, ensure compatibility with the node implementation.

### 6. Run Full Test Suite

```bash
npm run build
npm run lint
npm test
```

### 7. Test with Real OPC UA Server

Test the updated implementation with actual OPC UA servers to ensure functionality.

## Rollback Procedure

If issues arise after upgrading:

1. Revert the `package.json` change:
   ```bash
   npm install node-opcua@^2.156.0  # or previous working version
   ```

2. Revert any vendor code changes

3. Run tests to confirm rollback success

## Version Compatibility Matrix

| n8n-nodes-fiq-opcua | node-opcua | Status |
|---------------------|------------|--------|
| 0.1.10             | 2.156.0    | ✅ Tested |
| Future versions    | TBD        | 🔄 TBD |

## Notes

- The current minimal vendor approach eliminates most compatibility issues
- Only breaking changes in the core client API would require vendor updates
- Most `node-opcua` updates should be seamless with this implementation

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Ensure `node-opcua` is properly installed in `node_modules`
2. **Type errors**: Check if TypeScript definitions have changed
3. **Runtime errors**: Test with actual OPC UA servers to catch API changes

### Getting Help

- Check the [node-opcua changelog](https://github.com/node-opcua/node-opcua/blob/master/CHANGELOG.md)
- Review [node-opcua documentation](https://node-opcua.github.io/)
- Create an issue in this repository for package-specific problems 
