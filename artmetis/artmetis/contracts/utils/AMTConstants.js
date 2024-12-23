AMTConstants = {
    // roles
    ADMIN_ROLE: ethers.utils.id('ADMIN_ROLE'),
    MINTER_ROLE: ethers.utils.id('MINTER_ROLE'),
    BURNER_ROLE: ethers.utils.id('BURNER_ROLE'),
    // contracts
    ART_METIS: ethers.utils.id('ART_METIS'),
    AMT_REWARD_POOL: ethers.utils.id('AMT_REWARD_POOL'),
    AMT_DEPOSIT_POOL: ethers.utils.id('AMT_DEPOSIT_POOL'),
    L1_STAKING_POOL: ethers.utils.id('L1_STAKING_POOL'),
    METIS: ethers.utils.id('METIS'),
    METIS_ADDRESS: '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
    AMT_WITHDRAWAL_MANAGER: ethers.utils.id('AMT_WITHDRAWAL_MANAGER'),
}

module.exports = {
    AMTConstants,
}