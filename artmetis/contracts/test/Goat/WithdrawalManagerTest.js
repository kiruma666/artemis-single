const deploymentHelper = require("../../utils/deploymentHelpers.js")
const goatDeploymentHelper = require("./GoatDeploymentHelper.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const Constants = require("../../utils/Constants.js").Constants


contract('WithdrawalManager', async accounts => {
    let [owner, alice, bob, carol, deny] = accounts

    let contracts
    let artGoat
    let artBtc
    let rewardPool
    let depositPool
    let goatDepositPool
    let config
    let withdrawalManager
    let goatWithdrawalManager
    let withdrawalRecipient
    let sequencerPool
    let locking
    let goat

    const initiateWithdrawal = async (withdrawalManager, pool, amount, args) => {
        //await artBtc.approve(withdrawalManager.address, amount, args )
        await withdrawalManager.initiateWithdrawal(pool, amount, args)
    }

    const deploy = async () => {
        contracts = await deploymentHelper.deployGoat()
        artBtc = contracts.artBTC
        artGoat = contracts.artGoat
        rewardPool = contracts.rewardPool
        depositPool = contracts.btcDepositPool
        goatDepositPool = contracts.goatDepositPool
        config = contracts.config
        withdrawalManager = contracts.btcWithdrawalManager
        goatWithdrawalManager = contracts.goatWithdrawalManager
        withdrawalRecipient = contracts.withdrawalRecipient
        sequencerPool = contracts.sequencerPool
        locking = contracts.locking
        goat = contracts.goat

        await locking.addToken(th.ZERO_ADDRESS, 10000, dec(1, 22), dec(1, 18))
        await locking.addToken(goat.address, 10000, dec(1, 22), dec(1, 18))
        await depositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { from: deny, value: dec(1, 18)})
        await goat.mint(deny, dec(1, 18))
        await goat.approve(goatDepositPool.address, dec(1, 18), { from: deny })
        await goatDepositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { from: deny })
        await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })
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

    describe("test WithdrawalManager", async accounts => {
        it("test initiateWithdrawRequest()", async () => {
            await depositPool.deposit(sequencerPool.address, dec(1, 16), 0, "", { from: alice, value: dec(1, 16)})

            await assertRevert(withdrawalManager.initiateWithdrawal(sequencerPool.address, 0, { from: alice }), "WithdrawalManager: INVALID_AMOUNT")
            await assertRevert(withdrawalManager.initiateWithdrawal(sequencerPool.address, dec(2, 16), { from: alice }), "burn amount exceeds balance")

            let aliceArtMetisBalance = await artBtc.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, dec(1, 16))
            let withdrawalManagerArtMetisBalance = await artBtc.balanceOf(withdrawalManager.address)
            assert.equal(withdrawalManagerArtMetisBalance, 0)
            let totalDeposits = await depositPool.totalDeposited()
            assert.equal(totalDeposits, dec(101, 16))
            await initiateWithdrawal(withdrawalManager, sequencerPool.address, dec(1, 16), { from: alice })
            aliceArtMetisBalance = await artBtc.balanceOf(alice)
            assert.equal(aliceArtMetisBalance, 0)
            withdrawalManagerArtMetisBalance = await artBtc.balanceOf(withdrawalManager.address)
            assert.equal(withdrawalManagerArtMetisBalance, 0)
            totalDeposits = await depositPool.totalDeposited()
            assert.equal(totalDeposits, dec(1, 18))

            let userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(alice, { from: alice })
            assert.equal(userRequestLength, 1)
            let withdrawRequest = await withdrawalManager.getUserWithdrawRequest(alice, 0, { from: alice })
            let currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 16))
            assert.equal(withdrawRequest[1], dec(1, 16))
            assert.equal(withdrawRequest[2], currentTime)

            await depositPool.deposit(sequencerPool.address, dec(1, 15), 0, "", { from: bob, value: dec(1, 15)})
            await initiateWithdrawal(withdrawalManager, sequencerPool.address, dec(1, 15), { from: bob })
            userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(bob, { from: bob })
            assert.equal(userRequestLength, 1)
            withdrawRequest = await withdrawalManager.getUserWithdrawRequest(bob, 0, { from: bob })
            currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 15))
            assert.equal(withdrawRequest[1], dec(1, 15))
            assert.equal(withdrawRequest[2], currentTime)

            await depositPool.deposit(sequencerPool.address, dec(1, 14), 0, '', { from: alice, value: dec(1, 14) })
            await initiateWithdrawal(withdrawalManager, sequencerPool.address, dec(1, 14), { from: alice })
            userRequestLength = await withdrawalManager.getUserWithdrawRequestLength(alice, { from: alice })
            assert.equal(userRequestLength, 2)
            withdrawRequest = await withdrawalManager.getUserWithdrawRequest(alice, 1, { from: alice })
            currentTime = await th.getLatestBlockTimestamp(web3)
            assert.equal(withdrawRequest[0], dec(1, 14))
            assert.equal(withdrawRequest[1], dec(1, 14))
            assert.equal(withdrawRequest[2], currentTime)
        });

        it("test unlockWithdrawal()", async () => {
            await depositPool.deposit(sequencerPool.address, dec(1, 16), 0, '', { from: alice, value: dec(1, 16) })
            for (let i = 0; i < 10; i++) {
                await initiateWithdrawal(withdrawalManager, sequencerPool.address, dec(1, 15), { from: alice })
            }
            await assertRevert(withdrawalManager.unlockWithdrawal(0, { from: alice }), "missing role")
            await assertRevert(withdrawalManager.unlockWithdrawal(1), "amount exceeds balance")
            await web3.eth.sendTransaction({ from: owner, to: withdrawalRecipient.address, value: dec(1, 16) })

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
            await assertRevert(withdrawalManager.unlockWithdrawal(1), "WithdrawalManager: invalid first exclude nonce")
        });

        it("test completeWithdrawal()", async () => {
            await depositPool.deposit(sequencerPool.address, dec(1, 16), 0, '', { from: alice, value: dec(1, 16) })
            for (let i = 0; i < 10; i++) {
                await initiateWithdrawal(withdrawalManager, sequencerPool.address, dec(1, 15), { from: alice })
            }

            await assertRevert(withdrawalManager.completeWithdrawal({ from: owner }), "WithdrawalManager: no withdraw request")
            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request has not unlocked yet")

            await web3.eth.sendTransaction({ from: owner, to: withdrawalRecipient.address, value: dec(1, 16) })
            await withdrawalManager.unlockWithdrawal(1)
            let withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, dec(1, 15))

            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)
            await assertRevert(withdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)

            await withdrawalManager.completeWithdrawal({ from: alice })
            withdrawalBalance = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, withdrawalManager.address)
            assert.equal(withdrawalBalance, 0)

            for (let i = 1; i < 10; i++) {
                await assertRevert(withdrawalManager.completeWithdrawal({ from: alice, gasPrice: 0 }), "WithdrawalManager: withdraw request has not unlocked yet")
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

        it("test completeWithdrawal() with goat", async () => {
            await goat.mint(alice, dec(1, 16))
            await goat.approve(goatDepositPool.address, dec(1, 16), { from: alice })
            await goatDepositPool.deposit(sequencerPool.address, dec(1, 16), 0, '', { from: alice })
            for (let i = 0; i < 10; i++) {
                await initiateWithdrawal(goatWithdrawalManager, sequencerPool.address, dec(1, 15), { from: alice })
            }

            await assertRevert(goatWithdrawalManager.completeWithdrawal({ from: owner }), "WithdrawalManager: no withdraw request")
            await assertRevert(goatWithdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request has not unlocked yet")

            await goat.mint(withdrawalRecipient.address, dec(1, 16))
            await goatWithdrawalManager.unlockWithdrawal(1)
            let withdrawalBalance = await goat.balanceOf(goatWithdrawalManager.address)
            assert.equal(withdrawalBalance, dec(1, 15))

            await assertRevert(goatWithdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)
            await assertRevert(goatWithdrawalManager.completeWithdrawal({ from: alice }), "WithdrawalManager: withdraw request is not ready to complete")

            // forward 7 days
            await th.fastForwardTime(7 * 24 * 3600, web3.currentProvider)

            await goatWithdrawalManager.completeWithdrawal({ from: alice })
            withdrawalBalance = await goat.balanceOf(goatWithdrawalManager.address)
            assert.equal(withdrawalBalance, 0)

            for (let i = 1; i < 10; i++) {
                await assertRevert(goatWithdrawalManager.completeWithdrawal({ from: alice, gasPrice: 0 }), "WithdrawalManager: withdraw request has not unlocked yet")
            }

            await goatWithdrawalManager.unlockWithdrawal(10)
            for (let i = 1; i < 10; i++) {
                let balanceOfWithdrawalManagerBefore= await goat.balanceOf(goatWithdrawalManager.address)
                let balanceOfAliceBefore = await goat.balanceOf(alice)
                await goatWithdrawalManager.completeWithdrawal({ from: alice, gasPrice: 0 })
                let balanceOfWithdrawalManagerAfter= await goat.balanceOf(goatWithdrawalManager.address)
                let balanceOfAliceAfter = await goat.balanceOf(alice)
                assert.equal(balanceOfWithdrawalManagerBefore - balanceOfWithdrawalManagerAfter, dec(1, 15))
                assert.equal(balanceOfAliceAfter - balanceOfAliceBefore, dec(1, 15))

                withdrawalBalance = await goat.balanceOf(goatWithdrawalManager.address)
                if  (i < 9) {
                    assert.equal(withdrawalBalance, dec(10 - i - 1, 15))
                } else {
                    assert.equal(withdrawalBalance, 0)
                }
            }
        });

    });
});
