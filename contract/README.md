<div align="center">

# 🧟 $ZOMBS — WRAP / UNWRAP

**The First Hybrid Token+NFT Layer on Solana**

![License](https://img.shields.io/badge/license-MIT-green)
![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue)
![Solana](https://img.shields.io/badge/Solana-1.18-purple)
![Supply](https://img.shields.io/badge/Supply-1,111-red)

---

**[📄 Architecture](#architecture) • [🔧 Instructions](#instructions) • [🏗️ PDAs](#pdas) • [🔒 Security](#security) • [🚀 Deploy](#deploy)**

---

</div>

## 📋 Overview

$ZOMBS is a **hybrid token + NFT** protocol on Solana. Lock your $ZOMBS tokens into a program-derived vault and mint a unique Zombie NFT. The vault is **cryptographically bound** to the NFT — trade the NFT freely, and the vault follows. Burn the NFT anytime to release your tokens.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   HOLD $ZOMBS  ──→  WRAP & MINT NFT  ──→  TRADE FREELY     │
│                         ↓                                   │
│                   TOKENS LOCKED IN                          │
│                   PDA VAULT                                 │
│                         ↓                                   │
│   GET TOKENS BACK  ←──  UNWRAP (BURN NFT)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Architecture

The program uses **Program Derived Addresses (PDAs)** to bind tokens to NFTs without modifying the SPL token standard. This is the same pattern used by WrappedBulls — adapted for the $ZOMBS apocalypse.

### Account Structure

```
ZombieBank (singleton PDA ["bank"])
├── authority: Pubkey           ← upgrade authority
├── token_mint: Pubkey          ← $ZOMBS mint address
├── collection_mint: Pubkey     ← Metaplex collection NFT
├── total_wrapped: u64          ← NFTs minted so far
├── max_bulls: u64              ← 1,111 hard cap
├── tokens_per_bull: u64        ← 1,000,000 $ZOMBS
├── royalty_bps: u16            ← 500 (5%)
└── royalty_treasury: Pubkey

ZombieAsset (per-NFT PDA ["bull", tier_index])
├── nft_mint: Pubkey            ← the NFT mint address
├── owner: Pubkey               ← current holder
├── tier_index: u64             ← sequential index
└── wrapped_at: i64             ← timestamp
```

### Flow Diagram

```
┌─────────┐     ┌──────────┐     ┌───────────┐
│  USER   │     │  VAULT   │     │   NFT     │
│ WALLET  │     │  (PDA)   │     │   MINT    │
└────┬────┘     └────┬─────┘     └─────┬─────┘
     │               │                 │
     │  WRAP:        │                 │
     │──────────────>│  1M $ZOMBS      │
     │                              │  Mint 1 NFT
     │<─────────────────────────────│
     │               │                 │
     │  TRADE:       │                 │
     │  (NFT sold)   │  Vault follows  │
     │               │<────────────────│ New owner
     │               │                 │
     │  UNWRAP:      │                 │
     │               │  1M $ZOMBS back │
     │<──────────────│                 │ Burned
     │               │                 │
```

---

## 🔧 Instructions

| # | Instruction | Description |
|---|-------------|-------------|
| 1 | `initialize` | Creates the ZombieBank singleton. Authority-gated (one-time). |
| 2 | `initialize_collection` | Creates the Metaplex Collection NFT. One-time setup. |
| 3 | **`wrap`** | Locks `tokens_per_bull` $ZOMBS → mints a unique Zombie NFT → verifies into collection. |
| 4 | **`unwrap`** | Burns the NFT → drains the vault → returns `tokens_per_bull` $ZOMBS to caller. |

### Wrap Accounts (20)

```
bank, asset, nft_mint, nft_token_account, vault,
vault_authority, user_token_account, metadata,
master_edition, user,
token_program, associated_token_program,
token_metadata_program, system_program, rent
```

### Unwrap Accounts (12)

```
bank, asset, nft_mint, nft_token_account, vault,
vault_authority, user_token_account, user,
token_program, associated_token_program, system_program
```

---

## 🏗️ PDAs

| Seed | Account | Purpose |
|------|---------|---------|
| `["bank"]` | `ZombieBank` | Global state singleton |
| `["bull", tier_index]` | `ZombieAsset` | Per-NFT record |
| `["nft_mint", total_wrapped]` | `Mint` | Deterministic NFT mint |
| `["vault", nft_mint]` | `TokenAccount` | Authority over vault |

---

## 🔒 Security Model

| Invariant | Enforcement |
|-----------|-------------|
| **Only NFT holder can drain vault** | `asset.owner == user.key()` + ATA check |
| **Vault bound to NFT** | `seeds = ["vault", nft_mint]` — cryptographic |
| **No replay attacks** | Each wrap creates unique `nft_mint` |
| **Max supply** | `total_wrapped < max_bulls` — 1,111 hard cap |
| **No admin drain** | Zero instructions can move vault funds |
| **Correct token** | `user_token_account.mint == bank.token_mint` |

> ⚠️ **Audit Status**: This program has not been audited. Use at your own risk.

---

## 🚀 Deploy

### Prerequisites
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.11/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1
avm use 0.30.1

# Install deps
npm install
```

### Deploy to Devnet
```bash
solana config set --url devnet
anchor build
anchor deploy
anchor run test
```

### Deploy to Mainnet
```bash
# Update Anchor.toml with mainnet provider + wallet
solana config set --url mainnet-beta
anchor build --verifiable
anchor deploy --provider.cluster mainnet
```

---

## 🧪 Testing

```bash
anchor test
```

Runs 3 test cases:
- `Initializes the bank` — verifies bank state
- `Wraps tokens and mints NFT` — full wrap flow
- `Unwraps NFT and returns tokens` — full unwrap flow

---

## 📄 License

MIT © 2026 $ZOMBS

---

<div align="center">

**[⬆ Back to Top](#-zombs--wrap--unwrap)**

</div>
