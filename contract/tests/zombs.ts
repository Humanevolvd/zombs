import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zombs } from "../target/types/zombs";
import { expect } from "chai";

describe("zombs", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Zombs as Program<Zombs>;
  const bank = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bank")],
    program.programId
  )[0];

  it("Initializes the bank", async () => {
    const tokenMint = anchor.web3.Keypair.generate();
    const collectionMint = anchor.web3.Keypair.generate();
    const treasury = provider.wallet.publicKey;

    await program.methods
      .initialize(new anchor.BN(1111), new anchor.BN(1_000_000), 500)
      .accounts({
        bank,
        tokenMint: tokenMint.publicKey,
        collectionMint: collectionMint.publicKey,
        royaltyTreasury: treasury,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    const bankAccount = await program.account.zombieBank.fetch(bank);
    expect(bankAccount.maxBulls.toNumber()).to.equal(1111);
    expect(bankAccount.tokensPerBull.toNumber()).to.equal(1_000_000);
    expect(bankAccount.royaltyBps).to.equal(500);
    expect(bankAccount.totalWrapped.toNumber()).to.equal(0);
  });

  it("Wraps tokens and mints NFT", async () => {
    const bankAccount = await program.account.zombieBank.fetch(bank);
    const totalWrapped = bankAccount.totalWrapped;

    const tierIndex = new anchor.BN(totalWrapped.toNumber());
    const nftMintPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("nft_mint"), totalWrapped.toBuffer("le", 8)],
      program.programId
    )[0];

    const assetPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bull"), tierIndex.toBuffer("le", 8)],
      program.programId
    )[0];

    const vaultPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), nftMintPda.toBuffer()],
      program.programId
    )[0];

    const vaultAuthorityPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), nftMintPda.toBuffer()],
      program.programId
    )[0];

    const nftTokenAccount = anchor.utils.token.associatedAddress({
      mint: nftMintPda,
      owner: provider.wallet.publicKey,
    });

    const metadataPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        nftMintPda.toBuffer(),
      ],
      new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )[0];

    const masterEditionPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        nftMintPda.toBuffer(),
        Buffer.from("edition"),
      ],
      new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )[0];

    // This test assumes the user has tokens to wrap
    // In practice you'd need to set up token accounts with balance
    console.log("Wrap would require token balance setup");
    console.log("NFT Mint PDA:", nftMintPda.toBase58());
    console.log("Asset PDA:", assetPda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());
  });

  it("Unwraps NFT and returns tokens", async () => {
    // Integration test would go here after wrapping
    console.log("Unwrap test requires a wrapped NFT");
  });
});
