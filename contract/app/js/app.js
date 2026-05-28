// ===== CONFIG =====
const CONFIG = {
    programId: 'Z0MBS111111111111111111111111111111111111111',
    tokenMint: 'YOUR_TOKEN_MINT_HERE',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/tx/',
};

// ===== STATE =====
let wallet = null;
let provider = null;
let connection = null;
let userNfts = [];

// ===== DOM REFS =====
const connectBtn = document.getElementById('connectBtn');
const statusText = document.getElementById('statusText');
const dashboard = document.getElementById('dashboard');
const connectPrompt = document.getElementById('connectPrompt');
const tokenBalanceEl = document.getElementById('tokenBalance');
const nftCountEl = document.getElementById('nftCount');
const totalSupplyEl = document.getElementById('totalSupply');
const wrapBtn = document.getElementById('wrapBtn');
const unwrapBtn = document.getElementById('unwrapBtn');
const wrapStatus = document.getElementById('wrapStatus');
const unwrapStatus = document.getElementById('unwrapStatus');
const nftSelect = document.getElementById('nftSelect');
const toast = document.getElementById('toast');

// ===== UTILITY =====
function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function setStatus(text, connected) {
    statusText.textContent = text;
    statusText.className = connected ? 'connected' : '';
    connectBtn.textContent = connected
        ? `${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}`
        : 'CONNECT WALLET';
    connectBtn.classList.toggle('connected', connected);
}

function shortAddr(addr) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

// ===== WALLET CONNECTION =====
async function connectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            wallet = resp;
            provider = window.solana;
            connection = new solanaWeb3.Connection(CONFIG.rpcUrl);
            setStatus('CONNECTED', true);
            dashboard.style.display = 'block';
            connectPrompt.style.display = 'none';
            await refreshDashboard();
            showToast('Wallet connected', 'success');
        } catch (err) {
            showToast('Connection rejected', 'error');
        }
    } else {
        showToast('Install Phantom wallet', 'error');
        window.open('https://phantom.app', '_blank');
    }
}

async function disconnectWallet() {
    if (provider) {
        await provider.disconnect();
        wallet = null;
        provider = null;
        connection = null;
        setStatus('DISCONNECTED', false);
        dashboard.style.display = 'none';
        connectPrompt.style.display = 'block';
        wrapBtn.disabled = true;
        unwrapBtn.disabled = true;
        showToast('Wallet disconnected', 'success');
    }
}

connectBtn.addEventListener('click', () => {
    if (wallet) disconnectWallet();
    else connectWallet();
});

// Auto-connect if already authorized
window.addEventListener('load', async () => {
    if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
        await connectWallet();
    }
});

// ===== DASHBOARD =====
async function refreshDashboard() {
    if (!wallet || !connection) return;
    try {
        // Token balance
        const tokenMintPubkey = new solanaWeb3.PublicKey(CONFIG.tokenMint);
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            wallet.publicKey,
            { mint: tokenMintPubkey }
        );
        let balance = 0;
        tokenAccounts.value.forEach(acc => {
            const data = solanaWeb3.AccountLayout.decode(acc.account.data);
            balance += Number(data.amount);
        });
        tokenBalanceEl.textContent = (balance / 1_000_000).toLocaleString();

        // NFTs owned (mints from the program)
        const programId = new solanaWeb3.PublicKey(CONFIG.programId);
        const accounts = await connection.getProgramAccounts(programId, {
            filters: [
                { dataSize: 72 },
                { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } }
            ]
        });
        userNfts = accounts.map(acc => ({
            pubkey: acc.pubkey,
            data: acc.account.data,
        }));
        nftCountEl.textContent = userNfts.length;

        // Total wrapped (from bank)
        const [bankPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('bank')],
            programId
        );
        try {
            const bankInfo = await connection.getAccountInfo(bankPda);
            if (bankInfo) {
                const totalWrapped = Number(bankInfo.data.readBigUInt64LE(8 + 32 + 32 + 8));
                totalSupplyEl.textContent = `${totalWrapped} / 1111`;
            }
        } catch (e) {
            console.warn('Bank not found');
        }

        // Enable/disable buttons
        wrapBtn.disabled = false;
        renderNftSelect();
    } catch (err) {
        console.error('Dashboard refresh error:', err);
    }
}

// ===== NFT SELECT LIST =====
function renderNftSelect() {
    nftSelect.innerHTML = '';
    if (userNfts.length === 0) {
        nftSelect.innerHTML = '<p class="no-nfts">No NFTs to unwrap</p>';
        unwrapBtn.disabled = true;
        return;
    }

    userNfts.forEach((nft, i) => {
        const item = document.createElement('div');
        item.className = 'nft-item';
        item.innerHTML = `
            <img src="../photo_${(i % 8) + 1}_2026-05-28_03-19-37.jpg" alt="ZOMBIE NFT">
            <span>ZOMBIE #${i + 1}</span>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.nft-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            unwrapBtn.disabled = false;
        });
        nftSelect.appendChild(item);
    });
}

// ===== WRAP =====
wrapBtn.addEventListener('click', async () => {
    if (!wallet || !provider) return;
    wrapBtn.disabled = true;
    wrapStatus.textContent = 'SENDING TRANSACTION...';
    wrapStatus.className = 'tx-status pending';

    try {
        const amount = parseInt(document.getElementById('wrapAmount').value) || 1_000_000;
        const programId = new solanaWeb3.PublicKey(CONFIG.programId);
        const tokenMint = new solanaWeb3.PublicKey(CONFIG.tokenMint);

        const [bankPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('bank')], programId
        );

        const bankInfo = await connection.getAccountInfo(bankPda);
        if (!bankInfo) throw new Error('Bank not initialized');

        const totalWrapped = Number(bankInfo.data.readBigUInt64LE(8 + 32 + 32 + 8));
        const tierIndex = totalWrapped;

        const [assetPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('bull'), toBytesLE(tierIndex, 8)], programId
        );

        const [nftMintPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('nft_mint'), toBytesLE(totalWrapped, 8)], programId
        );

        const [vaultPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), nftMintPda.toBuffer()], programId
        );

        const [vaultAuthorityPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), nftMintPda.toBuffer()], programId
        );

        const nftTokenAccount = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                wallet.publicKey.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                nftMintPda.toBuffer(),
            ],
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const userTokenAccount = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                wallet.publicKey.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                tokenMint.toBuffer(),
            ],
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const TOKEN_METADATA_PROGRAM = new solanaWeb3.PublicKey(
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
        );

        const [metadataPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), nftMintPda.toBuffer()],
            TOKEN_METADATA_PROGRAM
        );

        const [masterEditionPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM.toBuffer(), nftMintPda.toBuffer(), Buffer.from('edition')],
            TOKEN_METADATA_PROGRAM
        );

        const tx = new solanaWeb3.Transaction();
        tx.add(
            new solanaWeb3.TransactionInstruction({
                programId,
                keys: [
                    { pubkey: bankPda, isSigner: false, isWritable: true },
                    { pubkey: assetPda, isSigner: false, isWritable: true },
                    { pubkey: nftMintPda, isSigner: false, isWritable: true },
                    { pubkey: nftTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    { pubkey: vaultAuthorityPda, isSigner: false, isWritable: false },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: metadataPda, isSigner: false, isWritable: true },
                    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                    { pubkey: solanaWeb3.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_METADATA_PROGRAM, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                ],
                data: Buffer.concat([
                    Buffer.from([0]), // wrap instruction index
                    toBytesLE(tierIndex, 8),
                ]),
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = wallet.publicKey;

        const signed = await provider.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());

        wrapStatus.textContent = `TX: ${shortAddr(sig)}`;
        wrapStatus.className = 'tx-status pending';

        await connection.confirmTransaction(sig);
        wrapStatus.textContent = `SUCCESS: ${shortAddr(sig)}`;
        wrapStatus.className = 'tx-status success';
        showToast('NFT Minted!', 'success');
        await refreshDashboard();
    } catch (err) {
        wrapStatus.textContent = `ERROR: ${err.message}`;
        wrapStatus.className = 'tx-status error';
        showToast('Wrap failed', 'error');
    }
    wrapBtn.disabled = false;
});

// ===== UNWRAP =====
unwrapBtn.addEventListener('click', async () => {
    if (!wallet || !provider) return;
    const selected = document.querySelector('.nft-item.selected');
    if (!selected) return;

    const index = Array.from(nftSelect.children).indexOf(selected);
    if (index === -1) return;

    unwrapBtn.disabled = true;
    unwrapStatus.textContent = 'SENDING TRANSACTION...';
    unwrapStatus.className = 'tx-status pending';

    try {
        const nft = userNfts[index];
        const programId = new solanaWeb3.PublicKey(CONFIG.programId);
        const tokenMint = new solanaWeb3.PublicKey(CONFIG.tokenMint);

        const [bankPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('bank')], programId
        );

        // Parse tier from asset account
        const tierIndex = Number(nft.data.readBigUInt64LE(8 + 32 + 32));
        const nftMintBytes = nft.data.slice(8, 8 + 32);

        const [assetPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('bull'), toBytesLE(tierIndex, 8)], programId
        );

        const nftMint = new solanaWeb3.PublicKey(nftMintBytes);

        const nftTokenAccount = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                wallet.publicKey.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                nftMint.toBuffer(),
            ],
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const [vaultPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), nftMint.toBuffer()], programId
        );

        const [vaultAuthorityPda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), nftMint.toBuffer()], programId
        );

        const userTokenAccount = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                wallet.publicKey.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                tokenMint.toBuffer(),
            ],
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const tx = new solanaWeb3.Transaction();
        tx.add(
            new solanaWeb3.TransactionInstruction({
                programId,
                keys: [
                    { pubkey: bankPda, isSigner: false, isWritable: true },
                    { pubkey: assetPda, isSigner: false, isWritable: true },
                    { pubkey: nftMint, isSigner: false, isWritable: true },
                    { pubkey: nftTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    { pubkey: vaultAuthorityPda, isSigner: false, isWritable: false },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                    { pubkey: solanaWeb3.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                data: Buffer.from([1]), // unwrap instruction index
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = wallet.publicKey;

        const signed = await provider.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());

        unwrapStatus.textContent = `TX: ${shortAddr(sig)}`;
        unwrapStatus.className = 'tx-status pending';

        await connection.confirmTransaction(sig);
        unwrapStatus.textContent = `SUCCESS: ${shortAddr(sig)}`;
        unwrapStatus.className = 'tx-status success';
        showToast('Tokens Unwrapped!', 'success');
        await refreshDashboard();
    } catch (err) {
        unwrapStatus.textContent = `ERROR: ${err.message}`;
        unwrapStatus.className = 'tx-status error';
        showToast('Unwrap failed', 'error');
    }
    unwrapBtn.disabled = false;
});

// ===== HELPERS =====
function toBytesLE(num, bytes) {
    const buf = Buffer.alloc(bytes);
    buf.writeBigUInt64LE(BigInt(num), 0);
    return buf;
}
