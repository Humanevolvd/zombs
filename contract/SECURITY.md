<div align="center">

# 🛡️ $ZOMBS — SECURITY MODEL

**Critical Invariants & Threat Analysis**

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Audit](https://img.shields.io/badge/Audit-Pending-yellow)

---

</div>

## 🔐 Core Invariants

### 1. Only NFT Holder Can Drain Vault

```
❌ Attacker steals vault by knowing its address
✅ Impossible — vault authority = PDA(["vault", nft_mint])
   Only unwrap instruction can sign, and only if caller
   proves NFT ownership via ATA
```

**Enforcement**: `asset.owner == user.key()` checked before any token movement.

### 2. Vault and NFT Are Cryptographically Bound

```
❌ Attacker creates fake vault for same NFT
✅ PDA derivation includes nft_mint in seeds —
   two different NFTs produce different vault PDAs
```

**Enforcement**: `seeds = [b"vault", nft_mint.key().to_bytes()]`

### 3. No Admin Drain Path Exists

| Instruction | Can move vault funds? |
|-------------|----------------------|
| `initialize` | ❌ Only creates bank |
| `initialize_collection` | ❌ Only creates metadata |
| `wrap` | ❌ Only moves user → vault |
| `unwrap` | ✅ But only for caller's own NFT |

**No backdoor. No authority override. No emergency drain.**

## 🧨 Threat Matrix

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Replay old wrap | Low | Each wrap increments `total_wrapped` → unique `nft_mint` |
| Front-running unwrap | Low | Only current holder can unwrap — front-runner would need NFT |
| PDA collision | None | `findProgramAddressSync` guarantees uniqueness per seed |
| Integer overflow | None | Anchor's `u64` checked + `require!` guards |
| Fake token deposits | None | `mint` field validated by Anchor `token::mint` constraint |

## ✅ Audit Checklist

- [x] All PDA seeds use canonical `findProgramAddressSync`
- [x] No arbitrary CPI calls — only SPL Token + Metaplex
- [x] No signer privilege escalation — `Signer` type enforced
- [x] Token burn verified before vault drain — `unwrap` sequence
- [x] Max supply enforced on-chain — `require!(total_wrapped < max_bulls)`
- [x] Vault closed after unwrap — `close = user` on asset
- [x] Collection verification — NFT minted into MCC

## 📋 Responsible Disclosure

Found a vulnerability? Contact us:
- **X**: `@zombs_sol`
- **No Telegram yet**

We will respond within 48 hours and issue a bounty for verified critical vulnerabilities.

---

<div align="center">

*Security is not a feature — it's a process.*

</div>
