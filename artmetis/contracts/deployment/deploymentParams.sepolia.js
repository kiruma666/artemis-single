const OUTPUT_FILE = "./deployment/sepoliaOutput.json"

const internalAddrs = {
    eth: "0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf",
}

const externalAddrs = {
    lockingPool: "0x7591940125cC0344a65D60319d1ADcD463B2D4c3", // fill in the metis locking pool address: https://github.com/MetisProtocol/metis-sequencer-contract/blob/main/deployments/sepolia/LockingPool.json
    l1Token: "0x7f49160EB9BB068101d445fe77E17ecDb37D0B47", // https://docs.metis.io/dev/readme/connection-details
    rewardRecipient: "0x89931A55d5576139C736F68ab56A3C06Ed123ea2", // fill in the rewardPool address on L2
}

const configs = {
}

module.exports = {
    OUTPUT_FILE,
    internalAddrs,
    externalAddrs,
    configs,
}