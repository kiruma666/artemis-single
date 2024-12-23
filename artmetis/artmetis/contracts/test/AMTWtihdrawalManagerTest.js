const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants


contract('AMTWithdrawalManager', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let artMetis
    let rewardPool
    let depositPool
    let amtConfig
    let withdrawalManager

    const initiateWithdrawal = async (amount, args) => {
        //await artMetis.approve(withdrawalManager.address, amount, args )
        await withdrawalManager.initiateWithdrawal(amount, args)
    }

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        artMetis = contracts.artMetis
        rewardPool = contracts.rewardPool
        depositPool = contracts.depositPool
        amtConfig = contracts.amtConfig
        withdrawalManager = contracts.withdrawalManager
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

    describe("test AMTWithdrawalManager", async accounts => {
        it("test initiateWithdrawRequest()", async () => {
            await depositPool.deposit(0, '', { from: alice, value: dec(1, 16) })

            await assertRevert(withdrawalManager.initiateWithdrawal(0, { from: alice }), "AMTWithdrawalManager: INVALID_AMOUNT")
            await assertRevert(withdrawalManager.initiateWithdrawal(dec(2, 16), { from: alice }), "burn amount exceeds balance")

            let aliceArtMetisBalance = await artMetis.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, dec(1, 16))
            let withdrawalManagerArtMetisBalance = await artMetis.balanceOf(withdrawalManager.address)
            assert.equal(withdrawalManagerArtMetisBalance, 0)
            let totalDeposits = await depositPool.totalDeposits()
            assert.equal(totalDeposits, dec(1, 16))
            await initiateWithdrawal(dec(1, 16), { from: alice })
            aliceArtMetisBalance = await artMetis.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, 0)
            withdrawalManagerArtMetisBalance = await artMetis.balanceOf(withdrawalManager.address)
            assert.equal(withdrawalManagerArtMetisBalance, 0)
            totalDeposits = await depositPool.totalDeposits()
            assert.equal(totalDeposits, 0)

            let userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(alice, { from: alice })
            assert.equal(userRequestLength, 1)
            let withdrawRequest = await withdrawalManager.getUserWithdrawRequest(alice, 0, { from: alice })
            let currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 16))
            assert.equal(withdrawRequest[1], dec(1, 16))
            assert.equal(withdrawRequest[2], currentTime)

            await depositPool.deposit(0, '', { from: bob, value: dec(1, 15) })
            await initiateWithdrawal(dec(1, 15), { from: bob })
            userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(bob, { from: bob })
            assert.equal(userRequestLength, 1)
            withdrawRequest = await withdrawalManager.getUserWithdrawRequest(bob, 0, { from: bob })
            currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 15))
            assert.equal(withdrawRequest[1], dec(1, 15))
            assert.equal(withdrawRequest[2], currentTime)

            await depositPool.deposit(0, '', { from: alice, value: dec(1, 14) })
            await initiateWithdrawal(dec(1, 14), { from: alice })
            userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(alice, { from: alice })
            assert.equal(userRequestLength, 2)
            withdrawRequest = await withdrawalManager.getUserWithdrawRequest(alice, 1, { from: alice })
            currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 14))
            assert.equal(withdrawRequest[1], dec(1, 14))
            assert.equal(withdrawRequest[2], currentTime)
        });

        it("test unlockWithdrawal()", async () => {
            await depositPool.deposit(0, '', { from: alice, value: dec(1, 16) })
            for (let i = 0; i < 10; i++) {
                await initiateWithdrawal(dec(1, 15), { from: alice })
            }
            await assertRevert(withdrawalManager.unlockWithdrawal(0, { from: alice }), "missing role")
            await depositPool.adminWithdrawMetis(dec(1, 16), { from: owner })
            await assertRevert(withdrawalManager.unlockWithdrawal(1), "AMTDepositPool: amount exceeds balance")
            await web3.eth.sendTransaction({ from: owner, to: depositPool.address, value: dec(1, 16) })

            let withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, 0)
            let nextUnlockNonce = await withdrawalManager.nextUnlockNonce()
            assert.equal(nextUnlockNonce, 0)
            let unlockAmount = await withdrawalManager.calculateUnlockNonce(1)
            assert.equal(unlockAmount, dec(1, 15))
            await withdrawalManager.unlockWithdrawal(1)
            withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, dec(1, 15))
            nextUnlockNonce = await withdrawalManager.nextUnlockNonce()
            assert.equal(nextUnlockNonce, 1)
            await assertRevert(withdrawalManager.unlockWithdrawal(1), "AMTWithdrawalManager: invalid first exclude nonce")
        });

        it("test completeWithdrawal()", async () => {
            await depositPool.deposit(0, '', { from: alice, value: dec(1, 16) })
            for (let i = 0; i < 10; i++) {
                await initiateWithdrawal(dec(1, 15), { from: alice })
            }

            await assertRevert(withdrawalManager.completeWithdrawal({ from: owner }), "AMTWithdrawalManager: no withdraw request")
            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "AMTWithdrawalManager: withdraw request has not unlocked yet")

            await withdrawalManager.unlockWithdrawal(1)
            let withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, dec(1, 15))

            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "AMTWithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)
            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "AMTWithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)

            await withdrawalManager.completeWithdrawal({ from: alice })
            withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, 0)

            for (let i = 1; i < 10; i++) {
                await assertRevert(withdrawalManager.completeWithdrawal({ from: alice, gasPrice: 0 }), "AMTWithdrawalManager: withdraw request has not unlocked yet")
            }

            await withdrawalManager.unlockWithdrawal(10)
            for (let i = 1; i < 10; i++) {
                let balanceOfWithdrawalManagerBefore= await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
                let balanceOfAliceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
                await withdrawalManager.completeWithdrawal({ from: alice, gasPrice: 0 })
                let balanceOfWithdrawalManagerAfter= await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
                let balanceOfAliceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
                assert.equal(balanceOfWithdrawalManagerBefore - balanceOfWithdrawalManagerAfter, dec(1, 15))
                assert.equal(balanceOfAliceAfter - balanceOfAliceBefore, dec(1, 15))

                withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
                if  (i < 9) {
                    assert.equal(withdrawalBalance, dec(10 - i - 1, 15))
                } else {
                    assert.equal(withdrawalBalance, 0)
                }
            }
        });

    });
});
