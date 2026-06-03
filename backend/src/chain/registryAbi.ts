export const SIGNAL_REGISTRY_ABI = [
  { type: "function", name: "submit", stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "string" }, { name: "signalType", type: "uint8" },
      { name: "subject", type: "address" }, { name: "direction", type: "uint8" },
      { name: "score", type: "uint16" }, { name: "evidenceHash", type: "bytes32" },
    ], outputs: [] },
  { type: "function", name: "resolve", stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "string" }, { name: "outcome", type: "uint8" }], outputs: [] },
] as const;
