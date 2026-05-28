use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ZombieBank {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub collection_mint: Pubkey,
    pub total_wrapped: u64,
    pub max_bulls: u64,
    pub tokens_per_bull: u64,
    pub royalty_bps: u16,
    pub royalty_treasury: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct ZombieAsset {
    pub nft_mint: Pubkey,
    pub owner: Pubkey,
    pub tier_index: u64,
    pub wrapped_at: i64,
}
