const OUTPUT_FILE = "./deployment/sepoliametisOutput.json"

const internalAddrs = {
    eth: "0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf",
}

const externalAddrs = {
    metis: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    l1_staking_pool_manager: "0x6D2E0719B4D47045172b82f7998616997FBCA534",
    usdt: "0x39F469BD0FAf440Ec1A7c4D0caD7850E5d31c62F",
    oracle: "0x0E0c52e29D7f8Bc216cA36156f7bE952b891B185",
}

const configs = {
    rewardPoolConfig: {
        feeReceiver: "0xa2D75aC82F9D381f800A29cF1C452F1Ae57F6392",
        feeRate: 0
    }
}

module.exports = {
    OUTPUT_FILE,
    internalAddrs,
    externalAddrs,
    configs,
}