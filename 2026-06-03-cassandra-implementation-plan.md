# Cassandra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an autonomous Mantle alpha agent that detects on-chain anomalies/smart-money moves, writes every call to an immutable on-chain registry under an ERC-8004 identity, delivers via Telegram, and proves its hit-rate on a fresh dark-luxury dashboard.

**Architecture:** Three subsystems. (1) Contracts: `AgentIdentity` (ERC-8004-style identity NFT) + `SignalRegistry` (hash-on-chain calls with submit/resolve ACL). (2) Backend: ingestion (Mantle RPC → decoded events) → 4 pure-function detectors → on-chain submit → Telegram delivery → resolver loop that closes calls to hit/miss. (3) Frontend: Next.js dashboard reading the registry, oracle-terminal design, live SSE "thinking" feed.

**Tech Stack:** Solidity 0.8.24, Hardhat, OpenZeppelin v5; Node.js 18+, TypeScript, viem v2, Telegraf; Next.js 14, wagmi v2, viem v2, Tailwind, Recharts; Mantle testnet (Sepolia, chainId 5003) + public RPC.

**Spec:** `Projects/Cassandra/2026-06-03-cassandra-design.md`

**Monorepo layout:**
```
Cassandra/
├── contracts/        Hardhat project (Phase 1)
├── backend/          ingestion + detectors + resolver + telegram (Phase 2)
├── frontend/         Next.js dashboard (Phase 3)
└── shared/           shared TS types (Signal, ChainEvent)
```

---

## Phase 0: Repo bootstrap

### Task 0.1: Initialize monorepo + shared types

**Files:**
- Create: `Cassandra/package.json`
- Create: `Cassandra/.gitignore`
- Create: `Cassandra/shared/types.ts`
- Create: `Cassandra/README.md`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "cassandra",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["contracts", "backend", "frontend"],
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.env
.env.local
dist/
artifacts/
cache/
.next/
coverage/
*.log
```

- [ ] **Step 3: Create shared/types.ts**

```ts
export type SignalType =
  | "whale_flow"
  | "new_wallet_accumulation"
  | "abnormal_liquidity"
  | "contract_interaction_spike";

export type Direction = "bullish" | "bearish" | "neutral";
export type SignalStatus = "pending" | "hit" | "miss";

export interface ChainEvent {
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  kind: "transfer" | "swap" | "sync" | "call";
  token?: `0x${string}`;
  from?: `0x${string}`;
  to?: `0x${string}`;
  value?: bigint;          // raw token units
  pool?: `0x${string}`;
  reserve0?: bigint;
  reserve1?: bigint;
  contract?: `0x${string}`;
  ts: number;              // unix seconds
}

export interface Signal {
  id: string;              // deterministic: `${type}:${subject}:${blockNumber}`
  type: SignalType;
  subject: `0x${string}`;  // token or wallet under watch
  direction: Direction;
  score: number;           // 0..100
  evidence: Record<string, unknown>; // the numbers/txs that triggered it
  blockNumber: bigint;
  ts: number;
}
```

- [ ] **Step 4: Create README.md**

```md
# Cassandra
Autonomous on-chain alpha agent for Mantle. Every call is written on-chain
(ERC-8004 identity) before the outcome is known — provable, unfakeable hit-rate.
See `2026-06-03-cassandra-design.md` for the design spec.
```

- [ ] **Step 5: Commit**

```bash
cd Cassandra && git init && git add -A
git commit -m "chore: bootstrap cassandra monorepo + shared types"
```

---

## Phase 1: Contracts

Produces deployable, fully-tested contracts. Working software on its own.

### Task 1.1: Hardhat project + AgentIdentity contract

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/contracts/AgentIdentity.sol`
- Test: `contracts/test/AgentIdentity.test.ts`

- [ ] **Step 1: Create contracts/package.json**

```json
{
  "name": "cassandra-contracts",
  "version": "0.1.0",
  "scripts": {
    "test": "hardhat test",
    "compile": "hardhat compile",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network mantleSepolia"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0",
    "@openzeppelin/contracts": "^5.0.2",
    "typescript": "^5.4.0",
    "ts-node": "^10.9.2"
  }
}
```

Run: `cd contracts && npm install`

- [ ] **Step 2: Create hardhat.config.ts**

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PK = process.env.DEPLOYER_PK ?? "";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    mantleSepolia: {
      url: process.env.MANTLE_RPC ?? "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: PK ? [PK] : [],
    },
  },
};
export default config;
```

- [ ] **Step 3: Write the failing test** — `contracts/test/AgentIdentity.test.ts`

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentIdentity", () => {
  it("mints one identity to the deployer and exposes agentId", async () => {
    const [owner] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AgentIdentity");
    const id = await F.deploy("Cassandra", "The seer whose calls are provable");
    await id.waitForDeployment();
    expect(await id.ownerOf(1n)).to.equal(owner.address);
    expect(await id.agentName(1n)).to.equal("Cassandra");
    expect(await id.totalMinted()).to.equal(1n);
  });

  it("reverts a second mint", async () => {
    const F = await ethers.getContractFactory("AgentIdentity");
    const id = await F.deploy("Cassandra", "x");
    await id.waitForDeployment();
    await expect(id.mint()).to.be.revertedWith("already minted");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd contracts && npx hardhat test test/AgentIdentity.test.ts`
Expected: FAIL — `AgentIdentity` artifact not found.

- [ ] **Step 5: Write AgentIdentity.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal ERC-8004-style agent identity. One soulbound-ish identity NFT
/// per agent; the token id is the on-chain reputation anchor referenced by
/// SignalRegistry. (If a vetted ERC-8004 reference impl is available at build
/// time, swap this for it; the interface SignalRegistry needs is just ownerOf.)
contract AgentIdentity is ERC721, Ownable {
    uint256 public totalMinted;
    mapping(uint256 => string) public agentName;
    mapping(uint256 => string) public agentBio;

    constructor(string memory name_, string memory bio_)
        ERC721("Cassandra Agent Identity", "CASS-ID")
        Ownable(msg.sender)
    {
        _mintTo(msg.sender, name_, bio_);
    }

    function mint() external onlyOwner {
        require(totalMinted == 0, "already minted");
        _mintTo(msg.sender, "Cassandra", "");
    }

    function _mintTo(address to, string memory name_, string memory bio_) internal {
        uint256 id = ++totalMinted;
        _safeMint(to, id);
        agentName[id] = name_;
        agentBio[id] = bio_;
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd contracts && npx hardhat test test/AgentIdentity.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 7: Commit**

```bash
git add contracts/package.json contracts/hardhat.config.ts contracts/contracts/AgentIdentity.sol contracts/test/AgentIdentity.test.ts
git commit -m "feat(contracts): ERC-8004-style AgentIdentity with single-mint guard"
```

### Task 1.2: SignalRegistry — submit with identity ACL

**Files:**
- Create: `contracts/contracts/SignalRegistry.sol`
- Test: `contracts/test/SignalRegistry.submit.test.ts`

- [ ] **Step 1: Write the failing test** — `contracts/test/SignalRegistry.submit.test.ts`

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

async function deploy() {
  const [agent, stranger] = await ethers.getSigners();
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "x");
  await id.waitForDeployment();
  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n); // agentId = 1
  await reg.waitForDeployment();
  return { agent, stranger, reg };
}

const ev = ethers.keccak256(ethers.toUtf8Bytes("evidence-json"));

describe("SignalRegistry.submit", () => {
  it("stores a pending signal from the agent-identity owner", async () => {
    const { reg } = await deploy();
    await reg.submit("whale_flow:0xabc:100", 0, "0x000000000000000000000000000000000000aBcd", 1, 87, ev);
    const s = await reg.getSignal("whale_flow:0xabc:100");
    expect(s.status).to.equal(0); // pending
    expect(s.score).to.equal(87);
    expect(s.evidenceHash).to.equal(ev);
    expect(await reg.totalSignals()).to.equal(1n);
  });

  it("reverts submit from a non-identity-owner", async () => {
    const { reg, stranger } = await deploy();
    await expect(
      reg.connect(stranger).submit("x:0x:1", 0, ethers.ZeroAddress, 1, 50, ev)
    ).to.be.revertedWith("not agent");
  });

  it("reverts duplicate signal id", async () => {
    const { reg } = await deploy();
    await reg.submit("dup:1", 0, ethers.ZeroAddress, 1, 50, ev);
    await expect(reg.submit("dup:1", 0, ethers.ZeroAddress, 1, 50, ev)).to.be.revertedWith("exists");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd contracts && npx hardhat test test/SignalRegistry.submit.test.ts`
Expected: FAIL — `SignalRegistry` not found.

- [ ] **Step 3: Write SignalRegistry.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice Immutable ledger of Cassandra's calls. submit() is gated on the
/// caller owning the Cassandra ERC-8004 identity. resolve() closes a pending
/// call exactly once. Records are append-only; status only moves pending->final.
contract SignalRegistry {
    enum Status { Pending, Hit, Miss }
    enum Direction { Bullish, Bearish, Neutral }

    struct Signal {
        SignalType_; // placeholder removed below
    }

    // --- storage ---
    IERC721 public immutable identity;
    uint256 public immutable agentId;
    address public resolver; // set once by deployer (the agent)
    address public immutable deployer;

    struct Record {
        string id;
        uint8 signalType;     // maps to shared SignalType enum index
        address subject;
        Direction direction;
        uint16 score;         // 0..100
        bytes32 evidenceHash;
        uint64 submittedAt;
        uint64 resolvedAt;
        Status status;
        bool exists;
    }

    mapping(string => Record) private records;
    string[] public ids;
    uint256 public totalSignals;
    uint256 public hits;
    uint256 public misses;

    event SignalSubmitted(string indexed idKey, string id, uint8 signalType, address subject, uint8 direction, uint16 score, bytes32 evidenceHash, uint64 ts);
    event SignalResolved(string indexed idKey, string id, uint8 status, uint64 ts);

    modifier onlyAgent() {
        require(identity.ownerOf(agentId) == msg.sender, "not agent");
        _;
    }

    constructor(address identity_, uint256 agentId_) {
        identity = IERC721(identity_);
        agentId = agentId_;
        deployer = msg.sender;
        resolver = msg.sender;
    }

    function setResolver(address r) external {
        require(msg.sender == deployer, "not deployer");
        resolver = r;
    }

    function submit(
        string calldata id,
        uint8 signalType,
        address subject,
        uint8 direction,
        uint16 score,
        bytes32 evidenceHash
    ) external onlyAgent {
        require(!records[id].exists, "exists");
        require(score <= 100, "score>100");
        records[id] = Record({
            id: id,
            signalType: signalType,
            subject: subject,
            direction: Direction(direction),
            score: score,
            evidenceHash: evidenceHash,
            submittedAt: uint64(block.timestamp),
            resolvedAt: 0,
            status: Status.Pending,
            exists: true
        });
        ids.push(id);
        totalSignals++;
        emit SignalSubmitted(id, id, signalType, subject, direction, score, evidenceHash, uint64(block.timestamp));
    }

    function resolve(string calldata id, uint8 outcome) external {
        require(msg.sender == resolver, "not resolver");
        Record storage r = records[id];
        require(r.exists, "no signal");
        require(r.status == Status.Pending, "already resolved");
        require(outcome == uint8(Status.Hit) || outcome == uint8(Status.Miss), "bad outcome");
        r.status = Status(outcome);
        r.resolvedAt = uint64(block.timestamp);
        if (r.status == Status.Hit) hits++; else misses++;
        emit SignalResolved(id, id, outcome, uint64(block.timestamp));
    }

    function getSignal(string calldata id) external view returns (Record memory) {
        return records[id];
    }

    function idsCount() external view returns (uint256) { return ids.length; }
}
```

> Note: delete the stray `struct Signal { SignalType_; }` block above before compiling — it is not valid and was left only to mark where the canonical `Record` struct lives. The real struct is `Record`.

- [ ] **Step 4: Remove the invalid placeholder struct**

Edit `SignalRegistry.sol`: delete these three lines entirely:
```solidity
    struct Signal {
        SignalType_; // placeholder removed below
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd contracts && npx hardhat test test/SignalRegistry.submit.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 6: Commit**

```bash
git add contracts/contracts/SignalRegistry.sol contracts/test/SignalRegistry.submit.test.ts
git commit -m "feat(contracts): SignalRegistry.submit gated on agent identity"
```

### Task 1.3: SignalRegistry — resolve once-only + hit-rate

**Files:**
- Test: `contracts/test/SignalRegistry.resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

async function deploy() {
  const [agent] = await ethers.getSigners();
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "x"); await id.waitForDeployment();
  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n); await reg.waitForDeployment();
  return { agent, reg };
}
const ev = ethers.keccak256(ethers.toUtf8Bytes("e"));

describe("SignalRegistry.resolve", () => {
  it("resolves a pending signal to hit and bumps the hit counter", async () => {
    const { reg } = await deploy();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await reg.resolve("a", 1); // Hit
    expect((await reg.getSignal("a")).status).to.equal(1);
    expect(await reg.hits()).to.equal(1n);
  });

  it("reverts a second resolve", async () => {
    const { reg } = await deploy();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await reg.resolve("a", 1);
    await expect(reg.resolve("a", 2)).to.be.revertedWith("already resolved");
  });

  it("reverts resolve from a non-resolver", async () => {
    const { reg } = await deploy();
    const [, other] = await ethers.getSigners();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await expect(reg.connect(other).resolve("a", 1)).to.be.revertedWith("not resolver");
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (logic already implemented in 1.2)

Run: `cd contracts && npx hardhat test test/SignalRegistry.resolve.test.ts`
Expected: PASS (3 passing). If any fail, fix `resolve` in `SignalRegistry.sol` until green.

- [ ] **Step 3: Commit**

```bash
git add contracts/test/SignalRegistry.resolve.test.ts
git commit -m "test(contracts): resolve once-only + resolver ACL + hit counter"
```

### Task 1.4: Deploy script + address export

**Files:**
- Create: `contracts/scripts/deploy.ts`
- Create: `contracts/deployments/.gitkeep`

- [ ] **Step 1: Write deploy.ts**

```ts
import { ethers, network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";

async function main() {
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "The seer whose calls are provable");
  await id.waitForDeployment();

  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n);
  await reg.waitForDeployment();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    agentIdentity: await id.getAddress(),
    signalRegistry: await reg.getAddress(),
    agentId: 1,
  };
  mkdirSync("deployments", { recursive: true });
  writeFileSync(`deployments/${network.name}.json`, JSON.stringify(out, null, 2));
  console.log("Deployed:", out);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 2: Run a localhost deploy smoke test**

Run: `cd contracts && npx hardhat node &` then in another shell `npx hardhat run scripts/deploy.ts --network localhost`
Expected: prints `Deployed: { ... agentIdentity, signalRegistry ... }` and writes `deployments/localhost.json`.

- [ ] **Step 3: Commit**

```bash
git add contracts/scripts/deploy.ts contracts/deployments/.gitkeep
git commit -m "feat(contracts): deploy script writing address manifest"
```

> Live testnet deploy (`npm run deploy:testnet` with `DEPLOYER_PK` + `MANTLE_RPC` set) happens in Phase 4 integration, not here.

---

## Phase 2: Backend (ingestion → detectors → submit → telegram → resolver)

Each detector is a pure function tested against fixtures. The engine wires them.

### Task 2.1: Backend scaffold + config

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/config.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: backend/package.json**

```json
{
  "name": "cassandra-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "dev": "tsx watch src/main.ts",
    "start": "tsx src/main.ts"
  },
  "dependencies": {
    "viem": "^2.21.0",
    "telegraf": "^4.16.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.16.0",
    "vitest": "^2.0.0"
  }
}
```

Run: `cd backend && npm install`

- [ ] **Step 2: backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "paths": { "@shared/*": ["../shared/*"] }
  },
  "include": ["src", "../shared"]
}
```

- [ ] **Step 3: backend/.env.example**

```
MANTLE_RPC=https://rpc.sepolia.mantle.xyz
AGENT_PK=0xyour_agent_private_key
SIGNAL_REGISTRY=0x...
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
START_BLOCK=latest
```

- [ ] **Step 4: backend/src/config.ts**

```ts
import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  rpc: req("MANTLE_RPC"),
  agentPk: process.env.AGENT_PK as `0x${string}` | undefined,
  signalRegistry: process.env.SIGNAL_REGISTRY as `0x${string}` | undefined,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChannel: process.env.TELEGRAM_CHANNEL_ID,
  startBlock: process.env.START_BLOCK ?? "latest",
};
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/.env.example backend/src/config.ts
git commit -m "chore(backend): scaffold + typed config loader"
```

### Task 2.2: Rolling state store

**Files:**
- Create: `backend/src/engine/state.ts`
- Test: `backend/src/engine/state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RollingState } from "./state.js";

describe("RollingState", () => {
  it("tracks net flow per token in a window and records first-seen wallets", () => {
    const s = new RollingState({ windowSec: 3600 });
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000);
    s.recordFlow("0xtok", "0xc", "0xb", 50n, 1100);
    expect(s.netInflow("0xtok", "0xb")).to.equal(150n);
    expect(s.firstSeen("0xb")).to.equal(1000);
  });

  it("evicts events older than the window", () => {
    const s = new RollingState({ windowSec: 100 });
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000);
    s.recordFlow("0xtok", "0xa", "0xb", 10n, 1201); // 201s later -> first evicted
    expect(s.netInflow("0xtok", "0xb")).to.equal(10n);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/engine/state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement state.ts**

```ts
interface FlowRec { token: string; from: string; to: string; value: bigint; ts: number; }

export class RollingState {
  private windowSec: number;
  private flows: FlowRec[] = [];
  private seen = new Map<string, number>(); // wallet -> first ts

  constructor(opts: { windowSec: number }) { this.windowSec = opts.windowSec; }

  recordFlow(token: string, from: string, to: string, value: bigint, ts: number) {
    if (!this.seen.has(to)) this.seen.set(to, ts);
    if (!this.seen.has(from)) this.seen.set(from, ts);
    this.flows.push({ token, from, to, value, ts });
    this.evict(ts);
  }

  private evict(now: number) {
    const cutoff = now - this.windowSec;
    while (this.flows.length && this.flows[0].ts < cutoff) this.flows.shift();
  }

  netInflow(token: string, wallet: string): bigint {
    let net = 0n;
    for (const f of this.flows) {
      if (f.token !== token) continue;
      if (f.to === wallet) net += f.value;
      if (f.from === wallet) net -= f.value;
    }
    return net;
  }

  firstSeen(wallet: string): number | undefined { return this.seen.get(wallet); }

  recentFlows(token: string): bigint[] {
    return this.flows.filter((f) => f.token === token).map((f) => f.value);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx vitest run src/engine/state.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Commit**

```bash
git add backend/src/engine/state.ts backend/src/engine/state.test.ts
git commit -m "feat(backend): rolling window state for flows + first-seen"
```

### Task 2.3: Detector 1 — whaleFlow

**Files:**
- Create: `backend/src/detectors/util.ts`
- Create: `backend/src/detectors/whaleFlow.ts`
- Test: `backend/src/detectors/whaleFlow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RollingState } from "../engine/state.js";
import { whaleFlow } from "./whaleFlow.js";
import type { ChainEvent } from "@shared/types";

function transfer(to: string, value: bigint, ts: number): ChainEvent {
  return { blockNumber: 1n, txHash: "0x1", logIndex: 0, kind: "transfer",
    token: "0xtok", from: "0xsrc", to: to as `0x${string}`, value, ts };
}

describe("whaleFlow", () => {
  it("fires bullish when net inflow is a top-percentile move", () => {
    const s = new RollingState({ windowSec: 3600 });
    for (let i = 0; i < 20; i++) s.recordFlow("0xtok", "0xsrc", `0xw${i}`, 10n, 1000 + i);
    const ev = transfer("0xbig", 5000n, 2000);
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    const sig = whaleFlow(s, ev);
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("whale_flow");
    expect(sig!.direction).to.equal("bullish");
    expect(sig!.score).to.be.greaterThan(70);
  });

  it("returns null for an ordinary-sized transfer", () => {
    const s = new RollingState({ windowSec: 3600 });
    for (let i = 0; i < 20; i++) s.recordFlow("0xtok", "0xsrc", `0xw${i}`, 100n, 1000 + i);
    const ev = transfer("0xsmall", 90n, 2000);
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(whaleFlow(s, ev)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/detectors/whaleFlow.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement detectors/util.ts**

```ts
export function percentile(values: bigint[], target: bigint): number {
  if (values.length === 0) return 1;
  let below = 0;
  for (const v of values) if (v <= target) below++;
  return below / values.length; // 0..1
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function signalId(type: string, subject: string, block: bigint): string {
  return `${type}:${subject}:${block.toString()}`;
}
```

- [ ] **Step 4: Implement detectors/whaleFlow.ts**

```ts
import type { ChainEvent, Signal } from "@shared/types";
import type { RollingState } from "../engine/state.js";
import { percentile, clampScore, signalId } from "./util.js";

const PCTILE_THRESHOLD = 0.95; // top 5% of recent flows

export function whaleFlow(state: RollingState, ev: ChainEvent): Signal | null {
  if (ev.kind !== "transfer" || !ev.token || !ev.to || ev.value === undefined) return null;
  const recent = state.recentFlows(ev.token);
  if (recent.length < 10) return null; // need a baseline
  const p = percentile(recent, ev.value);
  if (p < PCTILE_THRESHOLD) return null;
  const net = state.netInflow(ev.token, ev.to);
  const direction = net >= 0n ? "bullish" : "bearish";
  const score = clampScore(60 + (p - PCTILE_THRESHOLD) / (1 - PCTILE_THRESHOLD) * 40);
  return {
    id: signalId("whale_flow", ev.to, ev.blockNumber),
    type: "whale_flow",
    subject: ev.to,
    direction,
    score,
    evidence: { token: ev.token, value: ev.value.toString(), percentile: p, netInflow: net.toString(), txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/detectors/whaleFlow.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/detectors/util.ts backend/src/detectors/whaleFlow.ts backend/src/detectors/whaleFlow.test.ts
git commit -m "feat(backend): whaleFlow detector (percentile net-flow)"
```

### Task 2.4: Detector 2 — newWalletAccumulation

**Files:**
- Create: `backend/src/detectors/newWalletAccumulation.ts`
- Test: `backend/src/detectors/newWalletAccumulation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RollingState } from "../engine/state.js";
import { newWalletAccumulation } from "./newWalletAccumulation.js";
import type { ChainEvent } from "@shared/types";

describe("newWalletAccumulation", () => {
  it("fires when a wallet first-seen recently keeps accumulating", () => {
    const s = new RollingState({ windowSec: 86400 });
    const now = 100000;
    for (let i = 0; i < 4; i++) s.recordFlow("0xtok", "0xsrc", "0xnew", 100n, now + i);
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xnew", value: 100n, ts: now + 4 };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    const sig = newWalletAccumulation(s, ev, now + 4);
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("new_wallet_accumulation");
    expect(sig!.direction).to.equal("bullish");
  });

  it("returns null for an old wallet", () => {
    const s = new RollingState({ windowSec: 86400 });
    s.recordFlow("0xtok", "0xsrc", "0xold", 100n, 0); // first-seen at t=0
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xold", value: 100n, ts: 200000 };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(newWalletAccumulation(s, ev, 200000)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/detectors/newWalletAccumulation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement newWalletAccumulation.ts**

```ts
import type { ChainEvent, Signal } from "@shared/types";
import type { RollingState } from "../engine/state.js";
import { clampScore, signalId } from "./util.js";

const NEW_WALLET_MAX_AGE_SEC = 6 * 3600; // "new" = first seen within 6h
const MIN_NET = 0n;

export function newWalletAccumulation(state: RollingState, ev: ChainEvent, now: number): Signal | null {
  if (ev.kind !== "transfer" || !ev.token || !ev.to) return null;
  const firstSeen = state.firstSeen(ev.to);
  if (firstSeen === undefined) return null;
  const age = now - firstSeen;
  if (age > NEW_WALLET_MAX_AGE_SEC) return null;
  const net = state.netInflow(ev.token, ev.to);
  if (net <= MIN_NET) return null;
  // younger wallet + larger net = higher score
  const freshness = 1 - age / NEW_WALLET_MAX_AGE_SEC; // 0..1
  const score = clampScore(50 + freshness * 40);
  return {
    id: signalId("new_wallet_accumulation", ev.to, ev.blockNumber),
    type: "new_wallet_accumulation",
    subject: ev.to,
    direction: "bullish",
    score,
    evidence: { token: ev.token, ageSec: age, netInflow: net.toString(), txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx vitest run src/detectors/newWalletAccumulation.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Commit**

```bash
git add backend/src/detectors/newWalletAccumulation.ts backend/src/detectors/newWalletAccumulation.test.ts
git commit -m "feat(backend): newWalletAccumulation detector"
```

### Task 2.5: Detector 3 — abnormalLiquidity

**Files:**
- Create: `backend/src/engine/baseline.ts`
- Create: `backend/src/detectors/abnormalLiquidity.ts`
- Test: `backend/src/detectors/abnormalLiquidity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RollingBaseline } from "../engine/baseline.js";
import { abnormalLiquidity } from "./abnormalLiquidity.js";
import type { ChainEvent } from "@shared/types";

describe("abnormalLiquidity", () => {
  it("fires bearish when reserves drop beyond the stddev band (rug-like)", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xpool", 1000); // stable reserve ~1000
    const ev: ChainEvent = { blockNumber: 5n, txHash: "0x5", logIndex: 0, kind: "sync",
      pool: "0xpool", reserve0: 200n, reserve1: 0n, ts: 5000 };
    const sig = abnormalLiquidity(b, ev);
    expect(sig).not.toBeNull();
    expect(sig!.direction).to.equal("bearish");
    expect(sig!.type).to.equal("abnormal_liquidity");
  });

  it("returns null for a normal reserve wobble", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xpool", 1000 + (i % 3));
    const ev: ChainEvent = { blockNumber: 5n, txHash: "0x5", logIndex: 0, kind: "sync",
      pool: "0xpool", reserve0: 1001n, reserve1: 0n, ts: 5000 };
    expect(abnormalLiquidity(b, ev)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/detectors/abnormalLiquidity.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement engine/baseline.ts**

```ts
export class RollingBaseline {
  private size: number;
  private data = new Map<string, number[]>();
  constructor(size: number) { this.size = size; }

  push(key: string, value: number) {
    const arr = this.data.get(key) ?? [];
    arr.push(value);
    while (arr.length > this.size) arr.shift();
    this.data.set(key, arr);
  }

  stats(key: string): { mean: number; std: number; n: number } {
    const arr = this.data.get(key) ?? [];
    const n = arr.length;
    if (n === 0) return { mean: 0, std: 0, n: 0 };
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return { mean, std: Math.sqrt(variance), n };
  }
}
```

- [ ] **Step 4: Implement detectors/abnormalLiquidity.ts**

```ts
import type { ChainEvent, Signal } from "@shared/types";
import type { RollingBaseline } from "../engine/baseline.js";
import { clampScore, signalId } from "./util.js";

const Z_THRESHOLD = 3; // 3 stddev band
const MIN_SAMPLES = 10;

export function abnormalLiquidity(baseline: RollingBaseline, ev: ChainEvent): Signal | null {
  if (ev.kind !== "sync" || !ev.pool || ev.reserve0 === undefined) return null;
  const key = ev.pool;
  const reserve = Number(ev.reserve0);
  const { mean, std, n } = baseline.stats(key);
  baseline.push(key, reserve); // update after reading baseline
  if (n < MIN_SAMPLES || std === 0) return null;
  const z = (reserve - mean) / std;
  if (Math.abs(z) < Z_THRESHOLD) return null;
  const direction = z < 0 ? "bearish" : "bullish";
  const score = clampScore(60 + Math.min(Math.abs(z) - Z_THRESHOLD, 4) * 10);
  return {
    id: signalId("abnormal_liquidity", ev.pool, ev.blockNumber),
    type: "abnormal_liquidity",
    subject: ev.pool,
    direction,
    score,
    evidence: { reserve, mean, std, z, txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/detectors/abnormalLiquidity.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/engine/baseline.ts backend/src/detectors/abnormalLiquidity.ts backend/src/detectors/abnormalLiquidity.test.ts
git commit -m "feat(backend): abnormalLiquidity detector (z-score reserve band)"
```

### Task 2.6: Detector 4 — contractInteractionSpike

**Files:**
- Create: `backend/src/detectors/contractInteractionSpike.ts`
- Test: `backend/src/detectors/contractInteractionSpike.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RollingBaseline } from "../engine/baseline.js";
import { contractInteractionSpike } from "./contractInteractionSpike.js";
import type { ChainEvent } from "@shared/types";

describe("contractInteractionSpike", () => {
  it("fires when per-block interaction count jumps past baseline", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xc", 2); // ~2 calls/block baseline
    const ev: ChainEvent = { blockNumber: 7n, txHash: "0x7", logIndex: 0, kind: "call",
      contract: "0xc", ts: 7000 };
    const sig = contractInteractionSpike(b, ev, 30); // 30 calls this block
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("contract_interaction_spike");
    expect(sig!.direction).to.equal("neutral");
  });

  it("returns null for a normal block", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xc", 5);
    const ev: ChainEvent = { blockNumber: 7n, txHash: "0x7", logIndex: 0, kind: "call",
      contract: "0xc", ts: 7000 };
    expect(contractInteractionSpike(b, ev, 6)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/detectors/contractInteractionSpike.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement contractInteractionSpike.ts**

```ts
import type { ChainEvent, Signal } from "@shared/types";
import type { RollingBaseline } from "../engine/baseline.js";
import { clampScore, signalId } from "./util.js";

const Z_THRESHOLD = 3;
const MIN_SAMPLES = 10;

/** countThisBlock = number of interactions with ev.contract in ev.blockNumber */
export function contractInteractionSpike(
  baseline: RollingBaseline,
  ev: ChainEvent,
  countThisBlock: number
): Signal | null {
  if (ev.kind !== "call" || !ev.contract) return null;
  const key = ev.contract;
  const { mean, std, n } = baseline.stats(key);
  baseline.push(key, countThisBlock);
  if (n < MIN_SAMPLES || std === 0) return null;
  const z = (countThisBlock - mean) / std;
  if (z < Z_THRESHOLD) return null;
  const score = clampScore(55 + Math.min(z - Z_THRESHOLD, 5) * 9);
  return {
    id: signalId("contract_interaction_spike", ev.contract, ev.blockNumber),
    type: "contract_interaction_spike",
    subject: ev.contract,
    direction: "neutral",
    score,
    evidence: { count: countThisBlock, mean, std, z },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx vitest run src/detectors/contractInteractionSpike.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Commit**

```bash
git add backend/src/detectors/contractInteractionSpike.ts backend/src/detectors/contractInteractionSpike.test.ts
git commit -m "feat(backend): contractInteractionSpike detector"
```

### Task 2.7: Detector registry + cooldown gate

**Files:**
- Create: `backend/src/detectors/index.ts`
- Create: `backend/src/engine/cooldown.ts`
- Test: `backend/src/engine/cooldown.test.ts`

- [ ] **Step 1: Write the failing test for cooldown**

```ts
import { describe, it, expect } from "vitest";
import { Cooldown } from "./cooldown.js";

describe("Cooldown", () => {
  it("blocks the same subject+type within the cooldown window", () => {
    const c = new Cooldown(3600);
    expect(c.allow("whale_flow", "0xa", 1000)).to.equal(true);
    expect(c.allow("whale_flow", "0xa", 2000)).to.equal(false); // 1000s later
    expect(c.allow("whale_flow", "0xa", 5000)).to.equal(true);  // past 3600s
    expect(c.allow("whale_flow", "0xb", 2000)).to.equal(true);  // different subject
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/engine/cooldown.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement cooldown.ts**

```ts
export class Cooldown {
  private windowSec: number;
  private last = new Map<string, number>();
  constructor(windowSec: number) { this.windowSec = windowSec; }

  allow(type: string, subject: string, ts: number): boolean {
    const key = `${type}:${subject}`;
    const prev = this.last.get(key);
    if (prev !== undefined && ts - prev < this.windowSec) return false;
    this.last.set(key, ts);
    return true;
  }
}
```

- [ ] **Step 4: Implement detectors/index.ts**

```ts
import type { ChainEvent, Signal } from "@shared/types";
import { RollingState } from "../engine/state.js";
import { RollingBaseline } from "../engine/baseline.js";
import { whaleFlow } from "./whaleFlow.js";
import { newWalletAccumulation } from "./newWalletAccumulation.js";
import { abnormalLiquidity } from "./abnormalLiquidity.js";
import { contractInteractionSpike } from "./contractInteractionSpike.js";

export interface DetectorContext {
  state: RollingState;
  liquidityBaseline: RollingBaseline;
  interactionBaseline: RollingBaseline;
  now: number;
  interactionCount: (contract: string) => number;
}

export function runDetectors(ev: ChainEvent, ctx: DetectorContext): Signal[] {
  const out: Signal[] = [];
  const a = whaleFlow(ctx.state, ev); if (a) out.push(a);
  const b = newWalletAccumulation(ctx.state, ev, ctx.now); if (b) out.push(b);
  const c = abnormalLiquidity(ctx.liquidityBaseline, ev); if (c) out.push(c);
  if (ev.kind === "call" && ev.contract) {
    const d = contractInteractionSpike(ctx.interactionBaseline, ev, ctx.interactionCount(ev.contract));
    if (d) out.push(d);
  }
  return out;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/engine/cooldown.test.ts`
Expected: PASS (1 passing). Then `npx vitest run` — all backend tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/detectors/index.ts backend/src/engine/cooldown.ts backend/src/engine/cooldown.test.ts
git commit -m "feat(backend): detector registry + per-subject cooldown gate"
```

### Task 2.8: Mantle ingestion (RPC → ChainEvent)

**Files:**
- Create: `backend/src/ingest/abis.ts`
- Create: `backend/src/ingest/ingest.ts`
- Test: `backend/src/ingest/ingest.test.ts`

- [ ] **Step 1: Write the failing test (decode a Transfer log)**

```ts
import { describe, it, expect } from "vitest";
import { decodeLog } from "./ingest.js";

describe("decodeLog", () => {
  it("decodes an ERC-20 Transfer log into a ChainEvent", () => {
    const log = {
      address: "0x0000000000000000000000000000000000000Tok",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000000000000000000000000000000000000000aaaa",
        "0x000000000000000000000000000000000000000000000000000000000000bbbb",
      ] as `0x${string}`[],
      data: "0x0000000000000000000000000000000000000000000000000000000000000064", // 100
      blockNumber: 12n,
      transactionHash: "0xtx" as `0x${string}`,
      logIndex: 3,
    };
    const ev = decodeLog(log as any, 1700000000);
    expect(ev?.kind).to.equal("transfer");
    expect(ev?.value).to.equal(100n);
    expect(ev?.logIndex).to.equal(3);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/ingest/ingest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement ingest/abis.ts**

```ts
import { parseAbiItem } from "viem";

export const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);
export const SYNC_EVENT = parseAbiItem(
  "event Sync(uint112 reserve0, uint112 reserve1)"
);
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const SYNC_TOPIC =
  "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1";
```

- [ ] **Step 4: Implement ingest/ingest.ts**

```ts
import { createPublicClient, http, decodeEventLog, type Log } from "viem";
import type { ChainEvent } from "@shared/types";
import { TRANSFER_EVENT, SYNC_EVENT, TRANSFER_TOPIC, SYNC_TOPIC } from "./abis.js";
import { config } from "../config.js";

export const client = createPublicClient({ transport: http(config.rpc) });

export function decodeLog(log: Log, ts: number): ChainEvent | null {
  const topic0 = log.topics[0];
  try {
    if (topic0 === TRANSFER_TOPIC) {
      const d = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      const args = d.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
      return { blockNumber: log.blockNumber!, txHash: log.transactionHash!, logIndex: log.logIndex!,
        kind: "transfer", token: log.address as `0x${string}`, from: args.from, to: args.to, value: args.value, ts };
    }
    if (topic0 === SYNC_TOPIC) {
      const d = decodeEventLog({ abi: [SYNC_EVENT], data: log.data, topics: log.topics });
      const args = d.args as { reserve0: bigint; reserve1: bigint };
      return { blockNumber: log.blockNumber!, txHash: log.transactionHash!, logIndex: log.logIndex!,
        kind: "sync", pool: log.address as `0x${string}`, reserve0: args.reserve0, reserve1: args.reserve1, ts };
    }
  } catch { return null; }
  return null;
}

/** Pull all logs in a block range and decode. Returns events sorted by (block, logIndex). */
export async function fetchEvents(fromBlock: bigint, toBlock: bigint): Promise<ChainEvent[]> {
  const logs = await client.getLogs({ fromBlock, toBlock });
  const block = await client.getBlock({ blockNumber: toBlock });
  const ts = Number(block.timestamp);
  const events = logs.map((l) => decodeLog(l, ts)).filter((e): e is ChainEvent => e !== null);
  events.sort((a, b) => a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : Number(a.blockNumber - b.blockNumber));
  return events;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/ingest/ingest.test.ts`
Expected: PASS (1 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/ingest/abis.ts backend/src/ingest/ingest.ts backend/src/ingest/ingest.test.ts
git commit -m "feat(backend): Mantle RPC ingestion + Transfer/Sync log decode"
```

### Task 2.9: On-chain publisher (submit signal)

**Files:**
- Create: `backend/src/chain/registry.ts`
- Create: `backend/src/chain/registryAbi.ts`
- Test: `backend/src/chain/registry.test.ts`

- [ ] **Step 1: Write the failing test (evidence hashing is pure + testable)**

```ts
import { describe, it, expect } from "vitest";
import { hashEvidence, signalTypeIndex, directionIndex } from "./registry.js";

describe("registry encoding", () => {
  it("hashes evidence deterministically", () => {
    const h1 = hashEvidence({ a: 1, b: "x" });
    const h2 = hashEvidence({ b: "x", a: 1 }); // key order independent
    expect(h1).to.equal(h2);
    expect(h1).to.match(/^0x[0-9a-f]{64}$/);
  });
  it("maps signal type + direction to contract enum indexes", () => {
    expect(signalTypeIndex("whale_flow")).to.equal(0);
    expect(signalTypeIndex("contract_interaction_spike")).to.equal(3);
    expect(directionIndex("bullish")).to.equal(0);
    expect(directionIndex("neutral")).to.equal(2);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/chain/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement chain/registryAbi.ts**

```ts
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
```

- [ ] **Step 4: Implement chain/registry.ts**

```ts
import { createWalletClient, http, keccak256, toHex, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Signal, SignalType, Direction } from "@shared/types";
import { SIGNAL_REGISTRY_ABI } from "./registryAbi.js";
import { client } from "../ingest/ingest.js";
import { config } from "../config.js";

const TYPE_ORDER: SignalType[] = ["whale_flow", "new_wallet_accumulation", "abnormal_liquidity", "contract_interaction_spike"];
const DIR_ORDER: Direction[] = ["bullish", "bearish", "neutral"];

export function signalTypeIndex(t: SignalType): number { return TYPE_ORDER.indexOf(t); }
export function directionIndex(d: Direction): number { return DIR_ORDER.indexOf(d); }

export function hashEvidence(evidence: Record<string, unknown>): `0x${string}` {
  const sorted = Object.keys(evidence).sort().reduce((acc, k) => { acc[k] = (evidence as any)[k]; return acc; }, {} as Record<string, unknown>);
  return keccak256(toHex(JSON.stringify(sorted)));
}

export function makePublisher() {
  if (!config.agentPk || !config.signalRegistry) {
    return { submit: async (_s: Signal) => { throw new Error("publisher not configured"); }, configured: false as const };
  }
  const account = privateKeyToAccount(config.agentPk);
  const wallet = createWalletClient({ account, transport: http(config.rpc) });
  const address = config.signalRegistry;

  return {
    configured: true as const,
    /** writes the signal on-chain; returns tx hash on confirmation */
    async submit(s: Signal): Promise<`0x${string}`> {
      const hash = await wallet.writeContract({
        address, abi: SIGNAL_REGISTRY_ABI, functionName: "submit",
        args: [s.id, signalTypeIndex(s.type), s.subject, directionIndex(s.direction), s.score, hashEvidence(s.evidence)],
        chain: null,
      });
      await client.waitForTransactionReceipt({ hash });
      return hash;
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/chain/registry.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/chain/registry.ts backend/src/chain/registryAbi.ts backend/src/chain/registry.test.ts
git commit -m "feat(backend): on-chain signal publisher + deterministic evidence hash"
```

### Task 2.10: Telegram delivery (gated on confirmed submit)

**Files:**
- Create: `backend/src/telegram/format.ts`
- Create: `backend/src/telegram/bot.ts`
- Test: `backend/src/telegram/format.test.ts`

- [ ] **Step 1: Write the failing test (message formatting is pure)**

```ts
import { describe, it, expect } from "vitest";
import { formatSignal } from "./format.js";
import type { Signal } from "@shared/types";

const sig: Signal = {
  id: "whale_flow:0xabc:100", type: "whale_flow", subject: "0xabc",
  direction: "bullish", score: 88, evidence: { value: "5000" }, blockNumber: 100n, ts: 1700000000,
};

describe("formatSignal", () => {
  it("includes type, score, subject, explorer link and dashboard link", () => {
    const msg = formatSignal(sig, "0xTX", "https://sepolia.mantlescan.xyz", "https://cassandra.app");
    expect(msg).to.include("WHALE FLOW");
    expect(msg).to.include("88");
    expect(msg).to.include("0xabc");
    expect(msg).to.include("https://sepolia.mantlescan.xyz/tx/0xTX");
    expect(msg).to.include("https://cassandra.app");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/telegram/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement telegram/format.ts**

```ts
import type { Signal } from "@shared/types";

const ARROW: Record<string, string> = { bullish: "🟢▲", bearish: "🔴▼", neutral: "⚪◆" };

export function formatSignal(s: Signal, txHash: string, explorer: string, dashboard: string): string {
  const title = s.type.replace(/_/g, " ").toUpperCase();
  return [
    `${ARROW[s.direction]} *${title}*  (score ${s.score})`,
    `subject: \`${s.subject}\``,
    `direction: ${s.direction}`,
    `proof: ${explorer}/tx/${txHash}`,
    `record: ${dashboard}`,
  ].join("\n");
}
```

- [ ] **Step 4: Implement telegram/bot.ts**

```ts
import { Telegraf } from "telegraf";
import type { Signal } from "@shared/types";
import { formatSignal } from "./format.js";
import { config } from "../config.js";

const EXPLORER = "https://sepolia.mantlescan.xyz";
const DASHBOARD = process.env.DASHBOARD_URL ?? "https://cassandra.app";

export function makeBot() {
  if (!config.telegramToken || !config.telegramChannel) {
    return { send: async (_s: Signal, _tx: string) => {}, start: () => {}, configured: false as const };
  }
  const bot = new Telegraf(config.telegramToken);
  bot.command("record", (ctx) => ctx.reply(`Track record: ${DASHBOARD}`));
  return {
    configured: true as const,
    start() { bot.launch(); },
    async send(s: Signal, txHash: string) {
      await bot.telegram.sendMessage(config.telegramChannel!, formatSignal(s, txHash, EXPLORER, DASHBOARD), { parse_mode: "Markdown" });
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/telegram/format.test.ts`
Expected: PASS (1 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/telegram/format.ts backend/src/telegram/bot.ts backend/src/telegram/format.test.ts
git commit -m "feat(backend): telegram delivery formatted with on-chain proof link"
```

### Task 2.11: Resolver (auto hit/miss)

**Files:**
- Create: `backend/src/resolver/outcome.ts`
- Create: `backend/src/resolver/resolver.ts`
- Test: `backend/src/resolver/outcome.test.ts`

- [ ] **Step 1: Write the failing test (outcome decision is pure)**

```ts
import { describe, it, expect } from "vitest";
import { decideOutcome } from "./outcome.js";

describe("decideOutcome", () => {
  it("bullish call is a hit when price rises beyond threshold", () => {
    expect(decideOutcome("bullish", 100, 106, 0.05)).to.equal("hit");
  });
  it("bullish call is a miss when price falls", () => {
    expect(decideOutcome("bullish", 100, 99, 0.05)).to.equal("miss");
  });
  it("bearish call is a hit when price falls beyond threshold", () => {
    expect(decideOutcome("bearish", 100, 94, 0.05)).to.equal("hit");
  });
  it("neutral call is a hit when volatility exceeds threshold either way", () => {
    expect(decideOutcome("neutral", 100, 108, 0.05)).to.equal("hit");
    expect(decideOutcome("neutral", 100, 100.5, 0.05)).to.equal("miss");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && npx vitest run src/resolver/outcome.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement resolver/outcome.ts**

```ts
import type { Direction, SignalStatus } from "@shared/types";

/** threshold is a fraction, e.g. 0.05 = 5% move required to count. */
export function decideOutcome(dir: Direction, priceAt: number, priceAfter: number, threshold: number): Exclude<SignalStatus, "pending"> {
  const change = (priceAfter - priceAt) / priceAt;
  if (dir === "bullish") return change >= threshold ? "hit" : "miss";
  if (dir === "bearish") return change <= -threshold ? "hit" : "miss";
  return Math.abs(change) >= threshold ? "hit" : "miss"; // neutral = volatility call
}
```

- [ ] **Step 4: Implement resolver/resolver.ts**

```ts
import { createWalletClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SIGNAL_REGISTRY_ABI } from "../chain/registryAbi.js";
import { client } from "../ingest/ingest.js";
import { config } from "../config.js";
import { decideOutcome } from "./outcome.js";
import type { Direction } from "@shared/types";

// resolution windows per signal type (seconds)
export const RESOLUTION_WINDOW: Record<string, number> = {
  whale_flow: 6 * 3600,
  new_wallet_accumulation: 24 * 3600,
  abnormal_liquidity: 2 * 3600,
  contract_interaction_spike: 12 * 3600,
};

export interface PendingCall { id: string; type: string; direction: Direction; subject: `0x${string}`; submittedAt: number; priceAt: number; }

const HIT = 1, MISS = 2;

export function makeResolver(getPrice: (subject: `0x${string}`) => Promise<number>) {
  if (!config.agentPk || !config.signalRegistry) {
    return { resolveDue: async (_: PendingCall[], _now: number) => [] as string[], configured: false as const };
  }
  const account = privateKeyToAccount(config.agentPk);
  const wallet = createWalletClient({ account, transport: http(config.rpc) });
  const address = config.signalRegistry;

  return {
    configured: true as const,
    /** resolves all calls past their window; returns ids resolved */
    async resolveDue(pending: PendingCall[], now: number): Promise<string[]> {
      const done: string[] = [];
      for (const c of pending) {
        const window = RESOLUTION_WINDOW[c.type] ?? 6 * 3600;
        if (now - c.submittedAt < window) continue;
        const priceAfter = await getPrice(c.subject);
        const outcome = decideOutcome(c.direction, c.priceAt, priceAfter, 0.05);
        const hash = await wallet.writeContract({
          address, abi: SIGNAL_REGISTRY_ABI, functionName: "resolve",
          args: [c.id, outcome === "hit" ? HIT : MISS], chain: null,
        });
        await client.waitForTransactionReceipt({ hash });
        done.push(c.id);
      }
      return done;
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && npx vitest run src/resolver/outcome.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 6: Commit**

```bash
git add backend/src/resolver/outcome.ts backend/src/resolver/resolver.ts backend/src/resolver/outcome.test.ts
git commit -m "feat(backend): resolver auto hit/miss with per-type windows"
```

### Task 2.12: Engine main loop (wire it all)

**Files:**
- Create: `backend/src/sse.ts`
- Create: `backend/src/main.ts`
- Create: `backend/src/state-cursor.ts`

- [ ] **Step 1: Implement state-cursor.ts (persisted last-processed block)**

```ts
import { readFileSync, writeFileSync, existsSync } from "fs";
const FILE = ".cursor.json";

export function loadCursor(fallback: bigint): bigint {
  if (!existsSync(FILE)) return fallback;
  return BigInt(JSON.parse(readFileSync(FILE, "utf8")).block);
}
export function saveCursor(block: bigint) {
  writeFileSync(FILE, JSON.stringify({ block: block.toString() }));
}
```

- [ ] **Step 2: Implement sse.ts (broadcast "thinking" feed to dashboard)**

```ts
import { createServer, type ServerResponse } from "http";

const clients = new Set<ServerResponse>();

export function startSSE(port = 8787) {
  createServer((req, res) => {
    if (req.url !== "/feed") { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
      "Connection": "keep-alive", "Access-Control-Allow-Origin": "*",
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
  }).listen(port);
}

export function broadcast(event: unknown) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of clients) c.write(line);
}
```

- [ ] **Step 3: Implement main.ts (the loop)**

```ts
import { config } from "./config.js";
import { client, fetchEvents } from "./ingest/ingest.js";
import { RollingState } from "./engine/state.js";
import { RollingBaseline } from "./engine/baseline.js";
import { Cooldown } from "./engine/cooldown.js";
import { runDetectors } from "./detectors/index.js";
import { makePublisher } from "./chain/registry.js";
import { makeBot } from "./telegram/bot.js";
import { makeResolver, type PendingCall } from "./resolver/resolver.js";
import { loadCursor, saveCursor } from "./state-cursor.js";
import { startSSE, broadcast } from "./sse.js";

const POLL_MS = 5000;

async function main() {
  const state = new RollingState({ windowSec: 24 * 3600 });
  const liquidityBaseline = new RollingBaseline(50);
  const interactionBaseline = new RollingBaseline(50);
  const cooldown = new Cooldown(3600);
  const publisher = makePublisher();
  const bot = makeBot();
  const pending: PendingCall[] = [];
  const resolver = makeResolver(async (_subject) => 0); // price source wired in Phase 4

  if (bot.configured) bot.start();
  startSSE();

  let cursor = config.startBlock === "latest" ? await client.getBlockNumber() : loadCursor(BigInt(config.startBlock));

  // graceful degradation: backoff on RPC error, never crash the loop
  let backoff = POLL_MS;
  // interaction counting per block
  const interactionCount = new Map<string, number>();

  for (;;) {
    try {
      const head = await client.getBlockNumber();
      if (head <= cursor) { await sleep(POLL_MS); continue; }
      const to = head;
      const events = await fetchEvents(cursor + 1n, to);
      const now = Math.floor(Date.now() / 1000);

      interactionCount.clear();
      for (const ev of events) {
        if (ev.kind === "transfer" && ev.token && ev.from && ev.to && ev.value !== undefined) {
          state.recordFlow(ev.token, ev.from, ev.to, ev.value, ev.ts);
        }
        if (ev.kind === "call" && ev.contract) {
          interactionCount.set(ev.contract, (interactionCount.get(ev.contract) ?? 0) + 1);
        }
      }

      for (const ev of events) {
        broadcast({ kind: "thinking", block: ev.blockNumber.toString(), evKind: ev.kind, subject: ev.token ?? ev.pool ?? ev.contract });
        const signals = runDetectors(ev, {
          state, liquidityBaseline, interactionBaseline, now,
          interactionCount: (c) => interactionCount.get(c) ?? 0,
        });
        for (const s of signals) {
          if (!cooldown.allow(s.type, s.subject, s.ts)) continue;
          if (publisher.configured) {
            try {
              const tx = await publisher.submit(s);          // on-chain FIRST
              pending.push({ id: s.id, type: s.type, direction: s.direction, subject: s.subject, submittedAt: s.ts, priceAt: 0 });
              broadcast({ kind: "signal", signal: { ...s, blockNumber: s.blockNumber.toString() }, tx });
              if (bot.configured) await bot.send(s, tx);      // deliver only after confirmed write
            } catch (e) {
              broadcast({ kind: "degraded", reason: "submit failed", id: s.id });
            }
          } else {
            broadcast({ kind: "signal-dry", signal: { ...s, blockNumber: s.blockNumber.toString() } });
          }
        }
      }

      // resolve due calls
      if (resolver.configured) {
        const resolved = await resolver.resolveDue(pending, now);
        for (const id of resolved) {
          const i = pending.findIndex((p) => p.id === id);
          if (i >= 0) pending.splice(i, 1);
          broadcast({ kind: "resolved", id });
        }
      }

      cursor = to;
      saveCursor(cursor);
      backoff = POLL_MS;
      await sleep(POLL_MS);
    } catch (e) {
      broadcast({ kind: "degraded", reason: String(e) });
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60000); // exponential backoff, cap 60s
    }
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
main();
```

- [ ] **Step 4: Typecheck the backend**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. Fix any type mismatches against `@shared/types`.

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && npx vitest run`
Expected: all detector/engine/resolver/format tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main.ts backend/src/sse.ts backend/src/state-cursor.ts
git commit -m "feat(backend): engine main loop with on-chain-first delivery + SSE + backoff"
```

---

## Phase 3: Frontend (dashboard — oracle terminal / dark luxury)

Reads `SignalRegistry` events + the SSE feed. Fresh design system (spec §3.3).

### Task 3.1: Next.js scaffold + design tokens

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/app/globals.css`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/layout.tsx`

- [ ] **Step 1: frontend/package.json**

```json
{
  "name": "cassandra-frontend",
  "version": "0.1.0",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "next": "^14.2.0", "react": "^18.3.0", "react-dom": "^18.3.0",
    "viem": "^2.21.0", "wagmi": "^2.12.0", "@tanstack/react-query": "^5.51.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0", "@types/react": "^18", "@types/node": "^20",
    "tailwindcss": "^3.4.0", "postcss": "^8", "autoprefixer": "^10"
  }
}
```

Run: `cd frontend && npm install && npx tailwindcss init -p`

- [ ] **Step 2: tailwind.config.ts (oracle-terminal tokens)**

```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#0b0e0c", raised: "#12171400", panel: "#121714" },
        oracle: { DEFAULT: "#c9a227", glow: "#e8c44d" }, // muted gold accent
        hit: "#3fb950", miss: "#f85149", pending: "#8b949e",
        ink: { DEFAULT: "#e6efe9", dim: "#8fa399" },
      },
      fontFamily: { display: ["Fraunces", "serif"], mono: ["IBM Plex Mono", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --ease: cubic-bezier(0.16, 1, 0.3, 1); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

body { @apply bg-surface text-ink font-mono; background-image: radial-gradient(circle at 50% 0%, #14201a 0%, #0b0e0c 60%); }
```

- [ ] **Step 4: app/layout.tsx**

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Cassandra — provable on-chain alpha", description: "Every call written on-chain before the outcome." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Verify dev server boots**

Run: `cd frontend && npm run dev`
Expected: Next.js starts on :3000, blank styled page, no console errors. Stop with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/tailwind.config.ts frontend/app/globals.css frontend/app/layout.tsx frontend/postcss.config.js
git commit -m "feat(frontend): Next.js scaffold + oracle-terminal design tokens"
```

### Task 3.2: On-chain read hook (reuse plumbing pattern)

**Files:**
- Create: `frontend/lib/chain.ts`
- Create: `frontend/lib/registryAbi.ts`
- Create: `frontend/lib/useSignals.ts`

- [ ] **Step 1: lib/registryAbi.ts (events to read)**

```ts
export const REGISTRY_EVENTS_ABI = [
  { type: "event", name: "SignalSubmitted", inputs: [
    { name: "idKey", type: "string", indexed: true }, { name: "id", type: "string", indexed: false },
    { name: "signalType", type: "uint8", indexed: false }, { name: "subject", type: "address", indexed: false },
    { name: "direction", type: "uint8", indexed: false }, { name: "score", type: "uint16", indexed: false },
    { name: "evidenceHash", type: "bytes32", indexed: false }, { name: "ts", type: "uint64", indexed: false } ] },
  { type: "event", name: "SignalResolved", inputs: [
    { name: "idKey", type: "string", indexed: true }, { name: "id", type: "string", indexed: false },
    { name: "status", type: "uint8", indexed: false }, { name: "ts", type: "uint64", indexed: false } ] },
] as const;
```

- [ ] **Step 2: lib/chain.ts**

```ts
import { createPublicClient, http } from "viem";

export const RPC = process.env.NEXT_PUBLIC_MANTLE_RPC ?? "https://rpc.sepolia.mantle.xyz";
export const REGISTRY = process.env.NEXT_PUBLIC_SIGNAL_REGISTRY as `0x${string}`;
export const EXPLORER = "https://sepolia.mantlescan.xyz";
export const publicClient = createPublicClient({ transport: http(RPC) });

export const TYPE_LABEL = ["Whale Flow", "New-Wallet Accumulation", "Abnormal Liquidity", "Interaction Spike"];
export const DIR_LABEL = ["Bullish", "Bearish", "Neutral"];
export const STATUS_LABEL = ["Pending", "Hit", "Miss"];
```

- [ ] **Step 3: lib/useSignals.ts (read events, merge submit+resolve, with API-fallback mock)**

```ts
"use client";
import { useEffect, useState } from "react";
import { publicClient, REGISTRY } from "./chain.js";
import { REGISTRY_EVENTS_ABI } from "./registryAbi.js";

export interface Call {
  id: string; type: number; subject: string; direction: number;
  score: number; ts: number; status: number; resolvedTs?: number;
}

const MOCK: Call[] = [
  { id: "whale_flow:0xabc:100", type: 0, subject: "0xabc...beef", direction: 0, score: 88, ts: 1700000000, status: 1 },
  { id: "abnormal_liquidity:0xpool:140", type: 2, subject: "0xpool...d00d", direction: 1, score: 74, ts: 1700003600, status: 0 },
];

export function useSignals() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!REGISTRY) throw new Error("no registry configured");
        const submitted = await publicClient.getLogs({ address: REGISTRY, event: REGISTRY_EVENTS_ABI[0], fromBlock: 0n });
        const resolved = await publicClient.getLogs({ address: REGISTRY, event: REGISTRY_EVENTS_ABI[1], fromBlock: 0n });
        const map = new Map<string, Call>();
        for (const l of submitted) {
          const a = l.args as any;
          map.set(a.id, { id: a.id, type: a.signalType, subject: a.subject, direction: a.direction, score: a.score, ts: Number(a.ts), status: 0 });
        }
        for (const l of resolved) {
          const a = l.args as any; const c = map.get(a.id);
          if (c) { c.status = a.status; c.resolvedTs = Number(a.ts); }
        }
        if (active) setCalls([...map.values()].sort((x, y) => y.ts - x.ts));
      } catch {
        if (active) setCalls(MOCK); // standalone demo without live chain
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { calls, loading };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/chain.ts frontend/lib/registryAbi.ts frontend/lib/useSignals.ts
git commit -m "feat(frontend): on-chain signal read hook with mock fallback"
```

### Task 3.3: Hit-rate hero + call ledger UI

**Files:**
- Create: `frontend/components/HitRate.tsx`
- Create: `frontend/components/CallLedger.tsx`
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: components/HitRate.tsx**

```tsx
import type { Call } from "../lib/useSignals";

export function HitRate({ calls }: { calls: Call[] }) {
  const resolved = calls.filter((c) => c.status !== 0);
  const hits = resolved.filter((c) => c.status === 1).length;
  const rate = resolved.length ? Math.round((hits / resolved.length) * 100) : 0;
  return (
    <section className="text-center py-16">
      <p className="font-mono text-ink-dim tracking-widest text-sm">PROVABLE HIT-RATE</p>
      <p className="font-display text-oracle-glow" style={{ fontSize: "clamp(4rem,12vw,9rem)", lineHeight: 1 }}>{rate}%</p>
      <p className="font-mono text-ink-dim text-sm">{hits} hits / {resolved.length} resolved · {calls.length} total calls on-chain</p>
    </section>
  );
}
```

- [ ] **Step 2: components/CallLedger.tsx**

```tsx
import type { Call } from "../lib/useSignals";
import { TYPE_LABEL, DIR_LABEL, STATUS_LABEL, EXPLORER } from "../lib/chain";

const STATUS_CLASS = ["text-pending", "text-hit", "text-miss"];

export function CallLedger({ calls }: { calls: Call[] }) {
  return (
    <section className="max-w-4xl mx-auto px-4 pb-24">
      <h2 className="font-display text-2xl text-ink mb-4 border-b border-oracle/30 pb-2">The Ledger</h2>
      <ul className="space-y-2">
        {calls.map((c) => (
          <li key={c.id} className="grid grid-cols-[1fr_auto] gap-3 items-center bg-surface-panel/60 border border-oracle/15 rounded px-4 py-3 hover:border-oracle/50 transition-colors">
            <div>
              <span className="font-display text-ink">{TYPE_LABEL[c.type]}</span>
              <span className="font-mono text-ink-dim text-xs ml-2">{c.subject}</span>
              <div className="font-mono text-xs text-ink-dim">{DIR_LABEL[c.direction]} · score {c.score} · {new Date(c.ts * 1000).toUTCString()}</div>
            </div>
            <span className={`font-mono text-sm ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: app/page.tsx**

```tsx
"use client";
import { useSignals } from "../lib/useSignals";
import { HitRate } from "../components/HitRate";
import { CallLedger } from "../components/CallLedger";
import { ThinkingFeed } from "../components/ThinkingFeed";

export default function Home() {
  const { calls, loading } = useSignals();
  return (
    <main>
      <header className="text-center pt-16">
        <h1 className="font-display text-oracle" style={{ fontSize: "clamp(2.5rem,8vw,5rem)" }}>CASSANDRA</h1>
        <p className="font-mono text-ink-dim">the seer whose calls are provable</p>
      </header>
      <HitRate calls={calls} />
      <ThinkingFeed />
      {loading ? <p className="text-center text-ink-dim">reading the chain…</p> : <CallLedger calls={calls} />}
    </main>
  );
}
```

- [ ] **Step 4: Verify it renders with mock data**

Run: `cd frontend && npm run dev` → open :3000
Expected: hero hit-rate number, ledger with the two mock calls, oracle styling. (ThinkingFeed added next task — temporarily comment its import/use if building strictly in order.)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/HitRate.tsx frontend/components/CallLedger.tsx frontend/app/page.tsx
git commit -m "feat(frontend): hit-rate hero + on-chain call ledger"
```

### Task 3.4: Live "thinking" feed (SSE)

**Files:**
- Create: `frontend/lib/useSSE.ts`
- Create: `frontend/components/ThinkingFeed.tsx`

- [ ] **Step 1: lib/useSSE.ts (reused real-time hook pattern)**

```ts
"use client";
import { useEffect, useState } from "react";

export function useSSE(url: string, max = 12) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { const data = JSON.parse(e.data); setEvents((prev) => [data, ...prev].slice(0, max)); } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [url, max]);
  return events;
}
```

- [ ] **Step 2: components/ThinkingFeed.tsx**

```tsx
"use client";
import { useSSE } from "../lib/useSSE";

const FEED_URL = process.env.NEXT_PUBLIC_FEED_URL ?? "http://localhost:8787/feed";

export function ThinkingFeed() {
  const events = useSSE(FEED_URL);
  if (events.length === 0) return null;
  return (
    <section className="max-w-4xl mx-auto px-4 mb-12">
      <h2 className="font-mono text-ink-dim text-xs tracking-widest mb-2">CASSANDRA IS WATCHING</h2>
      <div className="font-mono text-xs space-y-1">
        {events.map((e, i) => (
          <div key={i} className="text-ink-dim opacity-90" style={{ opacity: 1 - i * 0.06 }}>
            {e.kind === "thinking" && <>· block {e.block} · {e.evKind} · {e.subject}</>}
            {e.kind === "signal" && <span className="text-oracle-glow">▲ SIGNAL {e.signal?.type} · score {e.signal?.score} · tx {String(e.tx).slice(0, 10)}…</span>}
            {e.kind === "resolved" && <span className="text-hit">✓ resolved {e.id}</span>}
            {e.kind === "degraded" && <span className="text-miss">feed degraded: {e.reason}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify the feed renders against a stub**

Run backend SSE only: `cd backend && node -e "import('./src/sse.js').then(m=>{m.startSSE();let i=0;setInterval(()=>m.broadcast({kind:'thinking',block:String(i++),evKind:'transfer',subject:'0xtok'}),1000)})"`
Then `cd frontend && npm run dev` → confirm the "CASSANDRA IS WATCHING" feed ticks. (If running TS directly, use `tsx src/sse-demo.ts` with an equivalent stub.)
Expected: live lines appear once per second.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/useSSE.ts frontend/components/ThinkingFeed.tsx
git commit -m "feat(frontend): live thinking feed via SSE"
```

### Task 3.5: Hit-rate-by-detector chart

**Files:**
- Create: `frontend/components/DetectorBreakdown.tsx`
- Modify: `frontend/app/page.tsx` (add the chart)

- [ ] **Step 1: components/DetectorBreakdown.tsx**

```tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import type { Call } from "../lib/useSignals";
import { TYPE_LABEL } from "../lib/chain";

export function DetectorBreakdown({ calls }: { calls: Call[] }) {
  const data = TYPE_LABEL.map((label, type) => {
    const r = calls.filter((c) => c.type === type && c.status !== 0);
    const hits = r.filter((c) => c.status === 1).length;
    return { label, rate: r.length ? Math.round((hits / r.length) * 100) : 0, n: r.length };
  });
  return (
    <section className="max-w-4xl mx-auto px-4 mb-12">
      <h2 className="font-display text-2xl text-ink mb-4">Hit-rate by detector</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="label" tick={{ fill: "#8fa399", fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#8fa399", fontSize: 11 }} />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#c9a227" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
```

- [ ] **Step 2: Add it to app/page.tsx**

Insert after `<HitRate calls={calls} />`:
```tsx
      <DetectorBreakdown calls={calls} />
```
And add the import at top:
```tsx
import { DetectorBreakdown } from "../components/DetectorBreakdown";
```

- [ ] **Step 3: Verify chart renders with mock data**

Run: `cd frontend && npm run dev`
Expected: bar chart of 4 detectors. No console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/DetectorBreakdown.tsx frontend/app/page.tsx
git commit -m "feat(frontend): hit-rate-by-detector chart"
```

---

## Phase 4: Integration, deploy, demo

### Task 4.1: Deploy contracts to Mantle Sepolia

- [ ] **Step 1:** Fund the deployer address with Mantle Sepolia test MNT (faucet).
- [ ] **Step 2:** Set `DEPLOYER_PK` + `MANTLE_RPC` in `contracts/.env`.
- [ ] **Step 3:** Run: `cd contracts && npm run deploy:testnet`
  Expected: prints + writes `deployments/mantleSepolia.json` with both addresses.
- [ ] **Step 4:** Verify on `https://sepolia.mantlescan.xyz` that both contracts exist and `AgentIdentity.ownerOf(1)` is the deployer.
- [ ] **Step 5: Commit** the deployment manifest.
```bash
git add contracts/deployments/mantleSepolia.json
git commit -m "chore(contracts): deploy AgentIdentity + SignalRegistry to Mantle Sepolia"
```

### Task 4.2: Wire backend env + price source for resolver

**Files:**
- Modify: `backend/src/main.ts` (replace the `getPrice` stub)
- Create: `backend/src/resolver/price.ts`

- [ ] **Step 1: Implement resolver/price.ts (Mantle DEX spot price via pool reserves)**

```ts
import { client } from "../ingest/ingest.js";
import { parseAbiItem } from "viem";

const GET_RESERVES = parseAbiItem("function getReserves() view returns (uint112,uint112,uint32)");

/** spot price of token vs its pair from a known pool; returns reserve ratio. */
export async function poolSpot(pool: `0x${string}`): Promise<number> {
  const [r0, r1] = (await client.readContract({ address: pool, abi: [GET_RESERVES], functionName: "getReserves" })) as [bigint, bigint, number];
  if (r0 === 0n) return 0;
  return Number(r1) / Number(r0);
}
```

- [ ] **Step 2:** In `main.ts`, replace `makeResolver(async (_subject) => 0)` with a price lookup that maps a subject to its pool (config-driven map `SUBJECT_POOL`), calling `poolSpot`. Capture `priceAt` at submit time by reading the same source when pushing to `pending` (set `priceAt: await poolSpot(pool)` where a pool is known; else skip resolution for that subject).

```ts
import { poolSpot } from "./resolver/price.js";
// SUBJECT_POOL: fill from deployments / known Mantle pools
const SUBJECT_POOL: Record<string, `0x${string}`> = {};
const resolver = makeResolver(async (subject) => {
  const pool = SUBJECT_POOL[subject.toLowerCase()];
  return pool ? poolSpot(pool) : 0;
});
```

- [ ] **Step 3:** Set `backend/.env` from `.env.example` with the deployed `SIGNAL_REGISTRY`, `AGENT_PK` (same key that owns identity #1), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `DASHBOARD_URL`.
- [ ] **Step 4:** `cd backend && npx tsc --noEmit` → no errors.
- [ ] **Step 5: Commit**
```bash
git add backend/src/resolver/price.ts backend/src/main.ts
git commit -m "feat(backend): wire resolver price source (Mantle pool reserves)"
```

### Task 4.3: End-to-end demo path (the live-stream rehearsal)

- [ ] **Step 1:** Start backend: `cd backend && npm start`. Confirm SSE on :8787 and "watching" logs.
- [ ] **Step 2:** Start frontend with `NEXT_PUBLIC_SIGNAL_REGISTRY` + `NEXT_PUBLIC_FEED_URL` set: `cd frontend && npm run dev`.
- [ ] **Step 3:** Trigger a signal on testnet: send a large test-token transfer / interact with a watched pool so a detector fires. (Or run a seed script that does N small transfers then one whale transfer.)
- [ ] **Step 4:** Verify the full chain:
  - Telegram channel receives the formatted signal with a working `mantlescan` tx link.
  - Dashboard ledger shows the new call as Pending; thinking feed showed the ▲ SIGNAL line.
  - On `mantlescan`, the `submit` tx exists, sent by the agent identity owner.
- [ ] **Step 5:** Fast-resolve test: temporarily lower a `RESOLUTION_WINDOW` value to ~60s, let the resolver fire, confirm the on-chain `resolve` tx and the dashboard hit-rate updating. Restore the window after.
- [ ] **Step 6:** Record a screen capture of the full flow for the submission video.
- [ ] **Step 7: Commit** any fixes found during the rehearsal.

### Task 4.4: Submission package

**Files:**
- Create: `Cassandra/SUBMISSION.md`

- [ ] **Step 1:** Write `SUBMISSION.md`: project name, track (AI Alpha & Data), one-paragraph pitch (the Cassandra/provable-record thesis), deployed addresses (identity + registry on Mantle Sepolia), Telegram link, dashboard URL, demo video link, and the three-feature mapping (on-chain benchmark / ERC-8004 identity / radical transparency) from spec §2.
- [ ] **Step 2:** Confirm DoraHacks BUIDL fields: repo link, deployed-on-Mantle proof (the deploy txs), demo video.
- [ ] **Step 3: Commit**
```bash
git add Cassandra/SUBMISSION.md
git commit -m "docs: hackathon submission package"
```

### Task 4.5: Register project in free-developments brain

**Files:**
- Create: `free-developments/Projects/Cassandra.md` (project-registry note, matching SentinelRWA/YieldPulse format)
- Modify: `free-developments/Projects/index.md`

- [ ] **Step 1:** Write `Projects/Cassandra.md` with frontmatter (`created`, `tags: [project, free-dev, hackathon, mantle]`, `status: hackathon`), Purpose, Stack, Key files, Reusable components (the 4 detectors, RollingState, SignalRegistry+AgentIdentity pattern, SSE thinking-feed, oracle-terminal design system), and Cross-links (trading-brain: detector scoring; airdrop-brain: new-wallet clustering = sybil signal; prediction-brain: anomaly feed).
- [ ] **Step 2:** Add a line for Cassandra to `Projects/index.md`.
- [ ] **Step 3:** This closes the brain-integration requirement: the build lives in free-developments with a registry note + reusable-component inventory for future projects.

---

## Self-Review

**Spec coverage:**
- Wedge (anomaly + provable on-chain record): Tasks 1.2–1.3 (registry), 2.3–2.6 (detectors), 2.9 (submit), 2.11 (resolve). ✓
- ERC-8004 identity: Task 1.1 + ACL in 1.2. ✓
- 4 detectors: Tasks 2.3, 2.4, 2.5, 2.6. ✓
- Telegram delivery gated on confirmed submit: Tasks 2.10 + 2.12 (on-chain-first ordering). ✓
- Dashboard fresh design (oracle terminal), reuse plumbing only: Phase 3, tokens in 3.1, plumbing hooks 3.2/3.4. ✓
- Auto hit/miss resolution + per-type windows: Task 2.11. ✓
- Error handling (RPC backoff, cursor, degraded state, on-chain-first): Tasks 2.12, 1.2 (resolve once-only). ✓
- Testing (pure detectors, contract ACL, e2e): each Phase-1/2 task + Task 4.3. ✓
- Out-of-scope honored: no execution (registry observes only), Mantle-only, no paid APIs (RPC + pool reserves). ✓
- Brain integration: Task 4.5. ✓

**Placeholder scan:** One intentional, flagged inline — the invalid `struct Signal` in 1.2 Step 3 is explicitly deleted in 1.2 Step 4 (teaching the engineer to remove it). `SUBJECT_POOL` map (4.2) is real runtime config, not a code placeholder. No "TBD"/"implement later" left.

**Type consistency:** `Signal`/`ChainEvent`/`SignalType`/`Direction`/`SignalStatus` defined once in `shared/types.ts` (0.1) and imported everywhere. Contract enum order (`TYPE_ORDER`, `DIR_ORDER` in 2.9) matches the dashboard labels (`TYPE_LABEL`, `DIR_LABEL` in 3.2). `signalId` format (`type:subject:block`) consistent between detectors (util.ts) and registry id usage. Status indexes (0 pending /1 hit /2 miss) consistent across contract, resolver, frontend.
