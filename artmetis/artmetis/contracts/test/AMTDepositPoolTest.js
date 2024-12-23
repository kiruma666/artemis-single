const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('AMTDepositPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let artMetis
    let rewardPool
    let depositPool
    let amtConfig

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        artMetis = contracts.artMetis
        rewardPool = contracts.rewardPool
        depositPool = contracts.depositPool
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

    describe("test depositPool", async accounts => {
        it("test deposit", async () => {
            await assertRevert(depositPool.deposit(0, '', { from: alice }), "AMTDepositPool: INVALID_AMOUNT")
            await depositPool.deposit(0, '', { from: alice, value: dec(1, 16) })
            let aliceArtMetisBalance = await artMetis.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, dec(1, 16))

            await depositPool.deposit(0, '', { from: bob, value: dec(1, 16) })
            let bobArtMetisBalance = await artMetis.balanceOf(bob)
            assert.equal(bobArtMetisBalance, dec(1, 16))

            // send eth to reward pool
            await web3.eth.sendTransaction({from: owner, to: rewardPool.address, value: dec(2, 16)})
            // set feeRate to 0
            await rewardPool.setFeeRate(0)

            await depositPool.deposit(0, '', { from: carol, value: dec(1, 16) })
            let carolArtMetisBalance = await artMetis.balanceOf(carol)
            assert.equal(carolArtMetisBalance.toString(), dec(5, 15))

            let totalDeposited = await depositPool.totalDeposits()
            assert.equal(totalDeposited.toString(), dec(5, 16))
        });

        it("test adminWithdrawMetis()", async () => {
            await depositPool.deposit(0, '', { from: alice, value: dec(1, 16) })
            let aliceArtMetisBalance = await artMetis.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, dec(1, 16))

            await depositPool.deposit(0, '', { from: bob, value: dec(1, 16) })
            let bobArtMetisBalance = await artMetis.balanceOf(bob)
            assert.equal(bobArtMetisBalance, dec(1, 16))

            await assertRevert(depositPool.adminWithdrawMetis(0, { from: alice }), "AMTDepositPool: only admin or withdrawal manager")

            await depositPool.grantRole(AMTConstants.ADMIN_ROLE, carol)
            await assertRevert(depositPool.adminWithdrawMetis(0, { from: carol }), "AMTDepositPool: invalid amount")
            await assertRevert(depositPool.adminWithdrawMetis(dec(3, 16), { from: carol }), "AMTDepositPool: amount exceeds balance")

            let metisBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, carol)
            await depositPool.adminWithdrawMetis(dec(2, 16), { from: carol, gasPrice: 0})
            let metisAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, carol)
            assert.equal(toBN(metisAfter).sub(toBN(metisBefore)).toString(), dec(2, 16))
        });

        it("test initialWithdraw()", async () => {
            await assertRevert(depositPool.initiateWithdrawalFor(alice, dec(1, 16), dec(1, 16), { from: alice }), "AMTDepositPool: only withdrawal manager")
        });
    });
});
