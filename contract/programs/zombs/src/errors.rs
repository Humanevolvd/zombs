use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Max supply reached")]
    MaxSupplyReached,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("NFT mint mismatch")]
    NftMintMismatch,
    #[msg("Not the NFT owner")]
    NotNftOwner,
    #[msg("Vault already exists")]
    VaultAlreadyExists,
    #[msg("Tier index out of bounds")]
    TierIndexOutOfBounds,
    #[msg("Collection already initialized")]
    CollectionAlreadyInitialized,
    #[msg("Invalid authority")]
    InvalidAuthority,
}
