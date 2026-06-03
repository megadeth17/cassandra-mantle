export const REGISTRY_EVENTS_ABI = [
  {
    type: "event",
    name: "SignalSubmitted",
    inputs: [
      { name: "idKey", type: "string", indexed: true },
      { name: "id", type: "string", indexed: false },
      { name: "signalType", type: "uint8", indexed: false },
      { name: "subject", type: "address", indexed: false },
      { name: "direction", type: "uint8", indexed: false },
      { name: "score", type: "uint16", indexed: false },
      { name: "evidenceHash", type: "bytes32", indexed: false },
      { name: "ts", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SignalResolved",
    inputs: [
      { name: "idKey", type: "string", indexed: true },
      { name: "id", type: "string", indexed: false },
      { name: "status", type: "uint8", indexed: false },
      { name: "ts", type: "uint64", indexed: false },
    ],
  },
] as const;
