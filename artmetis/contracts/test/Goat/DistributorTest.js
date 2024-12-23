const deploymentHelper = require("../../utils/deploymentHelpers.js")
const goatDeploymentHelper = require("./GoatDeploymentHelper.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

contract('Distributor', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let sequencerPool
    let distributor
    let locking
    let sequencerPoolManager
    let depositPool
    let artBTC
    let artGoat
    let goat
    let rewardPool
    let recipient;
    let artBtcRewardPool
    let artGoatRewardPool

    const deploy = async () => {
        contracts = await deploymentHelper.deployGoat()
        sequencerPool = contracts.sequencerPool
        distributor = await sequencerPool.distributor()
        locking = contracts.locking
        sequencerPoolManager = contracts.sequencerPoolManager
        depositPool = contracts.btcDepositPool
        artBTC = contracts.artBTC
        artGoat = contracts.artGoat
        goat = contracts.goat
        rewardPool = contracts.rewardPool
        recipient = contracts.rewardRecipient
        artBtcRewardPool = contracts.artBtcRewardPool
        artGoatRewardPool = contracts.artGoatRewardPool

        await locking.addToken(th.ZERO_ADDRESS, 10000, dec(1, 22), dec(1, 18))

        goat.mint(owner, dec(1, 22))
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

    describe("test Distributor", async accounts => {
        it("test distribute() only partner", async () => {
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await sequencerPool.addWhitelist(owner, { from: owner })
            await sequencerPool.addWhitelist(alice, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)})

            let balance = await web3.eth.getBalance(distributor)
            assert.equal(balance.toString(), 0)

            let balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            let ownerRewards = await rewardPool.btcRewards(owner)
            let aliceRewards = await rewardPool.btcRewards(alice)
            assert.equal(balanceOfRewardPool.toString(), dec(1, 18))
            assert.equal(ownerRewards.toString(), dec(1, 18))
            assert.equal(aliceRewards.toString(), 0)

            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)})

            balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            ownerRewards = await rewardPool.btcRewards(owner)
            aliceRewards = await rewardPool.btcRewards(alice)
            assert.equal(balanceOfRewardPool.toString(), dec(2, 18))
            assert.equal(ownerRewards.toString(), dec(15, 17))
            assert.equal(aliceRewards.toString(), dec(5, 17))
        });

        it("test distribute() only user", async () => {
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            let recipientBalanceBefore = await web3.eth.getBalance(recipient.address)
            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            let balance = await web3.eth.getBalance(distributor)
            assert.equal(balance.toString(), 0)
            let balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            assert.equal(balanceOfRewardPool.toString(), 0)
            let recipientBalanceAfter = await web3.eth.getBalance(recipient.address)
            assert.equal(recipientBalanceAfter - recipientBalanceBefore, dec(2, 16))

            recipientBalanceBefore = await web3.eth.getBalance(recipient.address)
            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            recipientBalanceAfter = await web3.eth.getBalance(recipient.address)
            assert.equal(recipientBalanceAfter - recipientBalanceBefore, dec(2, 16))
        });

        it("test distribute() with user and partner", async () => {
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            let recipientBalanceBefore = await web3.eth.getBalance(recipient.address)
            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            let balance = await web3.eth.getBalance(distributor)
            assert.equal(balance.toString(), 0)
            let balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            assert.equal(balanceOfRewardPool.toString(), dec(1, 18))
            let recipientBalanceAfter = await web3.eth.getBalance(recipient.address)
            assert.equal(recipientBalanceAfter - recipientBalanceBefore, 0)

            recipientBalanceBefore = recipientBalanceAfter

            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            recipientBalanceAfter = await web3.eth.getBalance(recipient.address)
            assert.equal(recipientBalanceAfter - recipientBalanceBefore, dec(1, 16))
            balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            assert.equal(balanceOfRewardPool.toString(), dec(154, 16))
        });

        it("test distribute() with diff rewards", async () => {
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            await goat.mint(distributor, dec(1, 18))
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            let goatBalance = await goat.balanceOf(distributor)
            assert.equal(goatBalance.toString(), 0)
            let goatBalanceOfRewardPool = await goat.balanceOf(rewardPool.address)
            assert.equal(goatBalanceOfRewardPool.toString(), dec(1, 18))

            await goat.mint(distributor, dec(1, 18))
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            goatBalance = await goat.balanceOf(distributor)
            assert.equal(goatBalance.toString(), 0)
            goatBalanceOfRewardPool = await goat.balanceOf(rewardPool.address)
            assert.equal(goatBalanceOfRewardPool.toString(), dec(154, 16))
            let goatBalanceOfRecipient = await goat.balanceOf(recipient.address)
            assert.equal(goatBalanceOfRecipient.toString(), dec(235, 15))
            let goatBalanceOfArbStakingPool = await goat.balanceOf(artBtcRewardPool.address)
            assert.equal(goatBalanceOfArbStakingPool.toString(), dec(225, 15))
        });
    });
});
