
// Optimized generated types
const DataType = {
  Null: 0, Boolean: 1, SByte: 2, Byte: 3, Int16: 4, UInt16: 5,
  Int32: 6, UInt32: 7, Int64: 8, UInt64: 9, Float: 10, Double: 11,
  String: 12, DateTime: 13, Guid: 14, ByteString: 15, XmlElement: 16,
  NodeId: 17, ExpandedNodeId: 18, StatusCode: 19, QualifiedName: 20,
  LocalizedText: 21, ExtensionObject: 22, DataValue: 23, Variant: 24,
  DiagnosticInfo: 25
};

const AttributeIds = {
  NodeId: 1, NodeClass: 2, BrowseName: 3, DisplayName: 4, Description: 5,
  WriteMask: 6, UserWriteMask: 7, IsAbstract: 8, Symmetric: 9, InverseName: 10,
  ContainsNoLoops: 11, EventNotifier: 12, Value: 13, DataType: 14, ValueRank: 15,
  ArrayDimensions: 16, AccessLevel: 17, UserAccessLevel: 18, MinimumSamplingInterval: 19,
  Historizing: 20, Executable: 21, UserExecutable: 22
};

module.exports = { DataType, AttributeIds };
exports.DataType = DataType;
exports.AttributeIds = AttributeIds;
