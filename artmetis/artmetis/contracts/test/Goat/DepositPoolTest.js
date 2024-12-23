const deploymentHelper = require("../../utils/deploymentHelpers.js")
const goatDeploymentHelper = require("./GoatDeploymentHelper.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

contract('DepositPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let sequencerPool
    let distributor
    let locking
    let sequencerPoolManager
    let depositPool
    let goatDepositPool
    let artBTC
    let artGoat
    let goat
    let rewardPool
    let recipient;
    let token

    const deploy = async () => {
        contracts = await deploymentHelper.deployGoat()
        sequencerPool = contracts.sequencerPool
        distributor = await sequencerPool.distributor()
        locking = contracts.locking
        sequencerPoolManager = contracts.sequencerPoolManager
        depositPool = contracts.btcDepositPool
        goatDepositPool = contracts.goatDepositPool
        artBTC = contracts.artBTC
        artGoat = contracts.artGoat
        goat = contracts.goat
        rewardPool = contracts.rewardPool
        recipient = contracts.rewardRecipient
        await locking.addToken(th.ZERO_ADDRESS, 10000, dec(1, 22), dec(1, 18))

        goat.mint(owner, dec(1, 22))
    }

    before(async () => {
        await deploy()
    })

    beforeEach(async () => {
        snapshotId = await th.takeSnapshot();
    });

    afterEach(async () => {
        await th.revertToSnapshot(snapshotId)
    });

    describe("test DepositPool", async accounts => {
        token = th.ZERO_ADDRESS

        it("test send eth to pool", async () => {
            await assertRevert(web3.eth.sendTransaction({ from: owner, to: depositPool.address, value: dec(1, 18) }), "no fallback nor receive")
        });

        it("test operate with pool not valid", async () => {
            await sequencerPoolManager.createPool(0, 0, 0, { from: owner })
            let pool = await sequencerPoolManager.getPool(1)
            await sequencerPoolManager.removePool(pool)

            await assertRevert(depositPool.deposit(pool, dec(1, 18), 0, ""), "DepositPool: INVALID_SEQUENCER_POOL")
            await assertRevert(depositPool.partnerDeposit(pool, dec(1, 18)), "DepositPool: INVALID_SEQUENCER_POOL")
            await assertRevert(depositPool.partnerWithdraw(pool, dec(1, 18)), "DepositPool: INVALID_SEQUENCER_POOL")
        });

        it("test deposit() with sequencer pool not open", async () => {
            await assertRevert(goatDeploymentHelper.deposit(depositPool, sequencerPool.address, 0), "DepositPool: INVALID_AMOUNT")
            await assertRevert(depositPool.deposit(sequencerPool.address, dec(1, 18), dec(2, 18), ""), "DepositPool: artToken is too high")
            await assertRevert(goatDeploymentHelper.deposit(depositPool, sequencerPool.address, 0), "DepositPool: INVALID_AMOUNT")

            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18))
            let balance = await goatDeploymentHelper.getAssetBalance(token, depositPool.address)
            let totalDeposited = await depositPool.totalDeposited()
            let artBtcBalance = await artBTC.balanceOf(owner)
            let balanceOfSequencerPool = await goatDeploymentHelper.getAssetBalance(token, sequencerPool.address)
            assert.equal(balance, 0)
            assert.equal(totalDeposited, dec(1, 18))
            assert.equal(artBtcBalance, dec(1, 18))
            assert.equal(balanceOfSequencerPool, dec(1, 18))

            await goat.mint(alice, dec(1, 18))
            await goat.approve(goatDepositPool.address, dec(1, 18), { from: alice })
            await goatDeploymentHelper.deposit(goatDepositPool, sequencerPool.address, dec(1, 18), { from: alice })
            balance = await goat.balanceOf(goatDepositPool.address)
            let totalGoatDeposited = await goatDepositPool.totalDeposited()
            let artGoatBalance = await artGoat.balanceOf(alice)
            let goatBalanceOfSequencerPool = await goat.balanceOf(sequencerPool.address)
            assert.equal(balance, 0)
            assert.equal(totalGoatDeposited, dec(1, 18))
            assert.equal(artGoatBalance, dec(1, 18))
            assert.equal(goatBalanceOfSequencerPool, dec(1, 18))
        });

        it("test deposit() with sequencer pool open", async () => {
            await depositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            let balance = await web3.eth.getBalance(depositPool.address)
            let totalBTCDeposited = await depositPool.totalDeposited()
            let artBtcBalance = await artBTC.balanceOf(owner)
            let balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
            let balanceOfLocking = await web3.eth.getBalance(locking.address)
            assert.equal(balance, 0)
            assert.equal(totalBTCDeposited, dec(1, 18))
            assert.equal(artBtcBalance, dec(1, 18))
            assert.equal(balanceOfSequencerPool, 0)
            assert.equal(balanceOfLocking, dec(1, 18))

            await depositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { value: dec(1, 18)})
            balance = await goat.balanceOf(depositPool.address)
            totalBTCDeposited = await depositPool.totalDeposited()
            artBtcBalance = await artBTC.balanceOf(owner)
            balanceOfSequencerPool = await goat.balanceOf(sequencerPool.address)
            balanceOfLocking = await web3.eth.getBalance(locking.address)
            assert.equal(balance, 0)
            assert.equal(totalBTCDeposited, dec(2, 18))
            assert.equal(artBtcBalance, dec(2, 18))
            assert.equal(balanceOfSequencerPool, 0)
            assert.equal(balanceOfLocking, dec(2, 18))
        });

        it("test partnerDeposit() with sequencer pool open", async () => {
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await goatDeploymentHelper.create(locking, sequencerPool, { from: owner })

            let balance = await web3.eth.getBalance(depositPool.address)
            let totalBTCDeposited = await depositPool.totalDeposited()
            let artBtcBalance = await artBTC.balanceOf(owner)
            let balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
            let balanceOfLocking = await web3.eth.getBalance(locking.address)
            assert.equal(balance, 0)
            assert.equal(totalBTCDeposited, 0)
            assert.equal(artBtcBalance, 0)
            assert.equal(balanceOfSequencerPool, 0)
            assert.equal(balanceOfLocking, dec(1, 18))
            let sequencerBtcTotalLocked = await sequencerPool.totalLocked(PLATFORM_TOKEN_ADDRESS)
            assert.equal(sequencerBtcTotalLocked, dec(1, 18))
            let ownerBtcLocked = await sequencerPool.userLocked(owner, PLATFORM_TOKEN_ADDRESS)
            assert.equal(ownerBtcLocked, dec(1, 18))

            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await depositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { value: dec(1, 18)})

            balance = await web3.eth.getBalance(depositPool.address)
            totalBTCDeposited = await depositPool.totalDeposited()
            artBtcBalance = await artBTC.balanceOf(owner)
            balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
            balanceOfLocking = await web3.eth.getBalance(locking.address)
            assert.equal(balance, 0)
            assert.equal(totalBTCDeposited, dec(1, 18))
            assert.equal(artBtcBalance, dec(1, 18))
            assert.equal(balanceOfSequencerPool, 0)
            assert.equal(balanceOfLocking, dec(2, 18))

            let balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            assert.equal(balanceOfRewardPool, dec(1, 18))

            let balanceOfRecipientBefore = await web3.eth.getBalance(recipient.address)
            let lockingBefore = await web3.eth.getBalance(locking.address)
            await web3.eth.sendTransaction({ from: owner, to: distributor, value: dec(1, 18) })
            await depositPool.deposit(sequencerPool.address, dec(1, 18), 0, "", { value: dec(1, 18)})

            balanceOfRewardPool = await web3.eth.getBalance(rewardPool.address)
            let balanceOfRecipientAfter = await web3.eth.getBalance(recipient.address)
            let lockingAfter = await web3.eth.getBalance(locking.address)
            assert.equal(balanceOfRewardPool, dec(154, 16))
            assert.equal(balanceOfRecipientAfter - balanceOfRecipientBefore, dec(1, 16))
            assert.equal(lockingAfter - lockingBefore, dec(145, 16))
        });
    });
});
