const OUTPUT_FILE = "./deployment/andromedaOutput.json"

const internalAddrs = {
    eth: "0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf",
}

const externalAddrs = {
    metis: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    l1_staking_pool_manager: "0x014e8248D3B681d4ed703dE60885052Ff4321F5d",
    usdt: "0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC", // https://explorer.metis.io/token/0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC
    priceFeed: "0xD4a5Bb03B5D66d9bf81507379302Ac2C2DFDFa6D", // https://explorer.metis.io/address/0xD4a5Bb03B5D66d9bf81507379302Ac2C2DFDFa6D/contract/1088/readContract
}

const configs = {
    rewardPoolConfig: {
        feeReceiver: "0xE21d3527B15F549Bd4ABB0f1008b02Ca25f0A8bc",
        feeRate: 0
    }
}

const TX_CONFIRMATIONS = 3 // for mainnet

const ETHERSCAN_BASE_URL = 'https://explorer.metis.io/address'

module.exports = {
    OUTPUT_FILE,
    internalAddrs,
    externalAddrs,
    configs,
    TX_CONFIRMATIONS,
    ETHERSCAN_BASE_URL,
}