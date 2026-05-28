import * as anchor from "@coral-xyz/anchor";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Zombs;

    const tokenMint = new anchor.web3.PublicKey("YOUR_TOKEN_MINT");
    const collectionMint = anchor.web3.Keypair.generate();
    const treasury = provider.wallet.publicKey;

    const [bankPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("bank")],
        program.programId
    );

    console.log("Initializing bank...");
    await program.methods
        .initialize(new anchor.BN(1111), new anchor.BN(1_000_000), 500)
        .accounts({
            bank: bankPda,
            tokenMint: tokenMint,
            collectionMint: collectionMint.publicKey,
            royaltyTreasury: treasury,
            authority: provider.wallet.publicKey,
            payer: provider.wallet.publicKey,
        })
        .rpc();

    console.log("Bank initialized at:", bankPda.toBase58());

    console.log("Initializing collection...");
    const metadataPda = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
            collectionMint.publicKey.toBuffer(),
        ],
        new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )[0];

    const masterEditionPda = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
            collectionMint.publicKey.toBuffer(),
            Buffer.from("edition"),
        ],
        new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )[0];

    await program.methods
        .initializeCollection("ZOMBS", "ZOMBS", "https://zombs.app/api/metadata/collection")
        .accounts({
            bank: bankPda,
            collectionMint: collectionMint.publicKey,
            metadata: metadataPda,
            masterEdition: masterEditionPda,
            payer: provider.wallet.publicKey,
        })
        .rpc();

    console.log("Collection initialized!");
    console.log("Collection mint:", collectionMint.publicKey.toBase58());
    console.log("Deploy complete!");
}

main().catch(console.error);
