const OUTPUT_FILE = "./deployment/mainnetOutput.json"

const internalAddrs = {
    eth: "0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf",
}

const externalAddrs = {
    lockingPool: "0xD54c868362C2098E0E46F12E7D924C6A332952Dd", // fill in the metis locking pool address: https://github.com/MetisProtocol/metis-sequencer-contract/blob/main/deployments/mainnet/LockingPool.json
    l1Token: "0x9e32b13ce7f2e80a01932b42553652e053d6ed8e", // https://docs.metis.io/dev/readme/connection-details
    rewardRecipient: "0x0Cf6ab3c169B0169E35aD58D350CbACdaF80E139", // fill in the rewardPool address on L2
}

const configs = {
}

const TX_CONFIRMATIONS = 3 // for mainnet

const ETHERSCAN_BASE_URL = 'http://etherscan.io/address'

module.exports = {
    OUTPUT_FILE,
    internalAddrs,
    externalAddrs,
    configs,
    ETHERSCAN_BASE_URL,
    TX_CONFIRMATIONS,
}