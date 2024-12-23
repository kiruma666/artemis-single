Constants = {
    // roles
    ADMIN_ROLE: ethers.utils.id('ADMIN_ROLE'),
    MINTER_ROLE: ethers.utils.id('MINTER_ROLE'),
    BURNER_ROLE: ethers.utils.id('BURNER_ROLE'),
    // contracts
    REWARD_RECIPIENT: ethers.utils.id('REWARD_RECIPIENT'),
    GOAT_TOKEN: ethers.utils.id('GOAT_TOKEN'),
    SEQUENCER_POOL_MANAGER: ethers.utils.id('SEQUENCER_POOL_MANAGER'),
    REWARD_POOL: ethers.utils.id('REWARD_POOL'),
    WITHDRAWAL_RECIPIENT: ethers.utils.id('WITHDRAWAL_RECIPIENT'),
}

module.exports = {
    Constants,
}
