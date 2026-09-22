# VeriTranscript

A blockchain-based academic credential verification platform. Universities issue tamper-proof digital credentials on-chain; students hold and share them; anyone can verify a credential's authenticity instantly, without contacting the issuing institution.

**Live demo:**(https://the-campus-ledger.vercel.app)

## Why

Traditional degree verification relies on manual attestation letters, transcript requests, and third-party verification services that are slow and easy to forge. VeriTranscript anchors each credential's hash on-chain and stores the document itself on IPFS, so a credential's authenticity can be checked in seconds by anyone holding the link or QR code, with no back-and-forth with the university.

## How it works

1. **Issuer** (university admin) uploads a credential document, which is pinned to IPFS via Pinata. A hash of the document, the student's wallet address, their name, and degree title are written to the `AcademicCredentialRegistry` smart contract.
2. **Student** can view their issued credentials and share a verification link or QR code.
3. **Verifier** (anyone — an employer, another institution) enters a credential hash or scans the QR code to pull the on-chain record directly from the contract, confirming who issued it, to whom, and when — with no possibility of silent tampering, since the registry only allows the issuing admin to write new records.

## Features

- **On-chain credential registry** — Solidity contract (`contracts/AcademicCredentialRegistry.sol`) storing credential hashes, student identity, degree name, and issue timestamp, with issuance restricted to the university admin address
- **IPFS document storage** — original credential documents pinned via Pinata, referenced by URI in the on-chain record
- **Wallet-based identity** — RainbowKit + wagmi + viem for connecting a student's or admin's wallet
- **QR code verification** — generate and scan QR codes that link directly to a credential's verification page
- **Batch verification** — verify multiple credentials in one pass
- **Public explorer** — browse issued credentials
- **Analytics dashboard** — issuance activity at a glance
- **Dark/light theme support**

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Blockchain | Solidity, Hardhat, deployed to Polygon Amoy (testnet) |
| Wallet / Web3 | wagmi, viem, RainbowKit, ethers.js |
| Storage | IPFS via Pinata |
| Other | x402 (payments SDK), QR code generation |

## Project structure

```
contracts/
  AcademicCredentialRegistry.sol   # on-chain credential registry
scripts/
  deploy.cjs                       # Hardhat deployment script
src/
  app/
    issuer/            # university admin: issue new credentials
    student/            # student view: see issued credentials
    verify/[hash]/      # public verification page
    batch-verify/        # verify multiple credentials at once
    explorer/            # browse all issued credentials
    analytics/           # issuance activity dashboard
    api/upload/           # IPFS upload endpoint (Pinata)
  components/            # Navbar, QR modal, status badges, theming
  config/                # contract address/ABI, wagmi config
```

## Running locally

```bash
npm install
cp .env.example .env.local   # add your Pinata JWT, gateway URL, and contract address
npm run dev
```

Visit `http://localhost:3000`.

### Smart contract deployment

```bash
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network amoy
```

Update `src/config/contract.ts` with the deployed contract address after deployment.

## Status

Built as an independent project; deployed to the Polygon Amoy testnet.
