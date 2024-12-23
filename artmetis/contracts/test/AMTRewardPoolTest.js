const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('AMTRewardPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let artMetis
    let rewardPool
    let amtConfig

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        artMetis = contracts.artMetis
        rewardPool = contracts.rewardPool
        amtConfig = contracts.amtConfig
    }

    beforeEach(async () => {
        snapshotId = await th.takeSnapshot();
    });
    afterEach(async () => {
        await th.revertToSnapshot(snapshotId)
    });

    before(async () => {
        await deploy()
    })

    describe("test rewardPool", async accounts => {

        it("test set fee receiver", async () => {
            await assertRevert(rewardPool.setFeeReceiver(alice, { from: alice }), "missing role")
            await rewardPool.setFeeReceiver(alice, { from: owner })
            let feeReceiver = await rewardPool.feeReceiver()
            assert.equal(feeReceiver, alice)
        });

        it("test set fee rate", async () => {
            await assertRevert(rewardPool.setFeeRate(1, { from: alice }), "missing role")
            await assertRevert(rewardPool.setFeeRate(dec(1, 19), { from: owner }), "invalid _feeRate!")
            await rewardPool.setFeeRate(1, { from: owner })
            let feeRate = await rewardPool.feeRate()
            assert.equal(feeRate, 1)
        });

        it("test claimReward", async () => {
            await assertRevert(rewardPool.claimReward({ from: alice }), "AMTRewardPool: ONLY_DEPOSIT_POOL")
            await amtConfig.setContract(AMTConstants.AMT_DEPOSIT_POOL, alice, { from: owner })
            await rewardPool.setFeeReceiver(bob, { from: owner })

            let aliceBalanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            await rewardPool.claimReward( { from: alice, gasPrice : 0 } )
            let aliceBalanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            assert.equal(aliceBalanceAfter - aliceBalanceBefore, 0)

            aliceBalanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            let bobBalanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            await web3.eth.sendTransaction({ from: carol, to: rewardPool.address, value: dec(1, 18) })
            await rewardPool.claimReward({ from: alice , gasPrice: 0 })
            aliceBalanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            let bobBalanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            assert.equal(aliceBalanceAfter - aliceBalanceBefore, dec(99, 16))
            assert.equal(bobBalanceAfter - bobBalanceBefore, dec(1, 16))
        });
    });
});
