use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3,
        MasterEditionAccount, Metadata, CreateMasterEditionV3, CreateMetadataAccountsV3,
    },
    token::{burn, mint_to, transfer, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::{
    accounts::MasterEdition,
    instructions::CreateV1Builder,
    types::{CollectionDetails, Creator, PrintSupply, TokenStandard},
    DigitalAsset,
};

pub mod errors;
pub mod state;

use errors::ErrorCode;
use state::*;

declare_id!("Z0MBS111111111111111111111111111111111111111");

#[program]
pub mod zombs {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, max_bulls: u64, tokens_per_bull: u64, royalty_bps: u16) -> Result<()> {
        let bank = &mut ctx.accounts.bank;
        bank.authority = ctx.accounts.authority.key();
        bank.token_mint = ctx.accounts.token_mint.key();
        bank.collection_mint = ctx.accounts.collection_mint.key();
        bank.total_wrapped = 0;
        bank.max_bulls = max_bulls;
        bank.tokens_per_bull = tokens_per_bull;
        bank.royalty_bps = royalty_bps;
        bank.royalty_treasury = ctx.accounts.royalty_treasury.key();
        Ok(())
    }

    pub fn initialize_collection(ctx: Context<InitializeCollection>, name: String, symbol: String, uri: String) -> Result<()> {
        let bank = &ctx.accounts.bank;
        let seeds = &[b"bank" as &[u8], &bank.key().to_bytes()];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.collection_mint.to_account_info(),
                mint_authority: ctx.accounts.bank.to_account_info(),
                payer: ctx.accounts.payer.to_account_info(),
                update_authority: ctx.accounts.bank.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        create_metadata_accounts_v3(cpi_ctx, name, symbol, uri, None, 0, None, true, true, None)?;

        let master_edition_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition.to_account_info(),
                mint: ctx.accounts.collection_mint.to_account_info(),
                update_authority: ctx.accounts.bank.to_account_info(),
                mint_authority: ctx.accounts.bank.to_account_info(),
                payer: ctx.accounts.payer.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        create_master_edition_v3(master_edition_ctx, None)?;
        Ok(())
    }

    pub fn wrap(ctx: Context<Wrap>, tier_index: u64) -> Result<()> {
        let bank = &mut ctx.accounts.bank;
        require!(bank.total_wrapped < bank.max_bulls, ErrorCode::MaxSupplyReached);

        let tokens_per_bull = bank.tokens_per_bull;
        let nft_mint = ctx.accounts.nft_mint.key();

        // Transfer tokens from user to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        transfer(transfer_ctx, tokens_per_bull)?;

        // Mint NFT
        let seeds = &[b"bank" as &[u8], &bank.key().to_bytes()];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.nft_token_account.to_account_info(),
                authority: ctx.accounts.bank.to_account_info(),
            },
            signer,
        );
        mint_to(mint_ctx, 1)?;

        // Create metadata
        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                mint_authority: ctx.accounts.bank.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                update_authority: ctx.accounts.bank.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        let nft_name = format!("ZOMBS {}", bank.total_wrapped + 1);
        create_metadata_accounts_v3(
            metadata_ctx,
            nft_name,
            "ZOMBS".to_string(),
            format!("https://zombs.app/api/metadata/{}", tier_index),
            None,
            bank.royalty_bps,
            Some(vec![Creator {
                address: bank.royalty_treasury,
                verified: false,
                share: 100,
            }]),
            true,
            true,
            Some(CollectionDetails::V1 { size: bank.max_bulls }),
        )?;

        // Create master edition
        let master_edition_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                update_authority: ctx.accounts.bank.to_account_info(),
                mint_authority: ctx.accounts.bank.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );
        create_master_edition_v3(master_edition_ctx, None)?;

        // Store asset info
        let asset = &mut ctx.accounts.asset;
        asset.nft_mint = nft_mint;
        asset.owner = ctx.accounts.user.key();
        asset.tier_index = tier_index;
        asset.wrapped_at = Clock::get()?.unix_timestamp;

        bank.total_wrapped += 1;
        Ok(())
    }

    pub fn unwrap(ctx: Context<Unwrap>) -> Result<()> {
        let bank = &mut ctx.accounts.bank;
        let asset = &ctx.accounts.asset;

        require!(asset.owner == ctx.accounts.user.key(), ErrorCode::NotNftOwner);
        require!(asset.nft_mint == ctx.accounts.nft_mint.key(), ErrorCode::NftMintMismatch);

        // Burn NFT
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.nft_mint.to_account_info(),
                from: ctx.accounts.nft_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        burn(burn_ctx, 1)?;

        // Transfer tokens from vault to user
        let seeds = &[b"vault" as &[u8], &asset.nft_mint.key().to_bytes()];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer,
        );
        transfer(transfer_ctx, bank.tokens_per_bull)?;

        // Close asset account
        let asset_info = ctx.accounts.asset.to_account_info();
        let user_info = ctx.accounts.user.to_account_info();
        let lamports = asset_info.lamports();
        **asset_info.lamports.borrow_mut() = 0;
        **user_info.lamports.borrow_mut() += lamports;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + ZombieBank::INIT_SPACE, seeds = [b"bank"], bump)]
    pub bank: Account<'info, ZombieBank>,
    pub token_mint: Account<'info, Mint>,
    pub collection_mint: Account<'info, Mint>,
    /// CHECK: validated by program
    pub royalty_treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeCollection<'info> {
    #[account(mut, seeds = [b"bank"], bump)]
    pub bank: Account<'info, ZombieBank>,
    /// CHECK: collection mint
    #[account(mut)]
    pub collection_mint: Account<'info, Mint>,
    /// CHECK: metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: master edition
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Wrap<'info> {
    #[account(mut, seeds = [b"bank"], bump)]
    pub bank: Account<'info, ZombieBank>,

    #[account(
        init,
        payer = user,
        space = 8 + ZombieAsset::INIT_SPACE,
        seeds = [b"bull", &tier_index.to_le_bytes()],
        bump
    )]
    pub asset: Account<'info, ZombieAsset>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = bank,
        mint::freeze_authority = bank,
        seeds = [b"nft_mint", &bank.total_wrapped.to_le_bytes()],
        bump
    )]
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: nft token account
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = user
    )]
    pub nft_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        token::mint = bank.token_mint,
        token::authority = vault_authority,
        seeds = [b"vault", &nft_mint.key().to_bytes()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    #[account(
        seeds = [b"vault", &nft_mint.key().to_bytes()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = bank.token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: metadata account (will be created)
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: master edition (will be created)
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unwrap<'info> {
    #[account(mut, seeds = [b"bank"], bump)]
    pub bank: Account<'info, ZombieBank>,

    #[account(
        mut,
        seeds = [b"bull", &asset.tier_index.to_le_bytes()],
        bump,
        close = user
    )]
    pub asset: Account<'info, ZombieAsset>,

    /// CHECK: nft mint
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = user
    )]
    pub nft_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = bank.token_mint,
        seeds = [b"vault", &nft_mint.key().to_bytes()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    #[account(
        seeds = [b"vault", &nft_mint.key().to_bytes()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = bank.token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
