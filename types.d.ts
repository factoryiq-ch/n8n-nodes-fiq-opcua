// TypeScript declarations for vendor modules

declare module '@vendor' {
  export const OPCUAClient: any;
  export const SecurityPolicy: any;
  export const MessageSecurityMode: any;
  export const UserTokenType: any;
  export const AttributeIds: any;
  export const DataType: any;
}

declare module '@vendor/*' {
  const content: any;
  export default content;
}
