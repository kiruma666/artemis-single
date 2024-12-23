const OUTPUT_FILE = "./deployment/goattestnetOutput.json"

const internalAddrs = {
    eth: "0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf",
    rewardRecipient: "0x3c2285f4341D3906f5c44cF1c670216762A33aD1"
}

const externalAddrs = {
    locking: "0xbC10000000000000000000000000000000000004",
    goat: "0xbC10000000000000000000000000000000000001",
}

const configs = {
    assets: [
        {
            name: 'GOAT',
            address: externalAddrs.goat,
            rewardWeight: 100,
            rewardToken: [internalAddrs.eth]
        },
        {
            name: 'BTC',
            address: internalAddrs.eth,
            rewardWeight: 10000,
            rewardToken: [externalAddrs.goat]
        }
    ],
    sequencerPool: [
        {
            id: 0,
            name: 'ownerSequencerPool',
            feeRate: '1' + '0'.repeat(17),
            feeShare: '2' + '0'.repeat(17),
            extraShare: '5' + '0'.repeat(17),
        },
        {
            id: 1,
            name: 'userSequencerPool',
            feeRate: '1' + '0'.repeat(17),
            feeShare: '2' + '0'.repeat(17),
            extraShare: '5' + '0'.repeat(17),
        },
    ],
}

module.exports = {
    OUTPUT_FILE,
    internalAddrs,
    externalAddrs,
    configs,
}