export interface FactoryIQNodeOutput {
  timestamp: number;                // When the data was read/produced (Unix ms)
  source: string;                   // Data source identifier (e.g., "PLC1", "ModbusDeviceA")
  protocol: string;                 // "sparkplugb" | "opcua" | "modbus" | ...
  address?: string;                 // Optional: register, nodeId, topic, etc.
  metrics: Record<string, any>;     // Key-value pairs of data points
  status?: string;                  // Optional: "ok", "error", etc.
  meta?: Record<string, any>;       // Optional: extra metadata
}
