export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_docHash", "type": "bytes32" },
      { "internalType": "address", "name": "_student", "type": "address" },
      { "internalType": "string", "name": "_ipfsURI", "type": "string" },
      { "internalType": "string", "name": "_studentName", "type": "string" },
      { "internalType": "string", "name": "_degreeName", "type": "string" }
    ],
    "name": "issueCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_docHash", "type": "bytes32" }],
    "name": "verify",
    "outputs": [
      { "internalType": "bool", "name": "isValid", "type": "bool" },
      { "internalType": "address", "name": "student", "type": "address" },
      { "internalType": "string", "name": "ipfsURI", "type": "string" },
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "degreeName", "type": "string" },
      { "internalType": "uint256", "name": "issueTimestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;