const deploymentHelper = require("../../utils/deploymentHelpers.js")
const goatDeploymentHelper = require("./GoatDeploymentHelper.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");
const SequencerPool = artifacts.require('SequencerPool.sol')

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

contract('SequencerPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let sequencerPool
    let locking
    let sequencerPoolManager
    let goat
    let config
    let depositPool
    let goatDepositPool

    let pubkey
    let validatorAddress
    let ethAddress
    let R
    let S
    let V

    const deploy = async () => {
        contracts = await deploymentHelper.deployGoat()
        sequencerPool = contracts.sequencerPool
        locking = contracts.locking
        sequencerPoolManager = contracts.sequencerPoolManager
        goat = contracts.goat
        config = contracts.config
        depositPool = contracts.btcDepositPool
        goatDepositPool = contracts.goatDepositPool

        let result = goatDeploymentHelper.generate(31337, sequencerPool.address)
        pubkey = result.pubkey
        validatorAddress = result.consAddr
        ethAddress = result.ethAddress
        R = result.R
        S = result.S
        V = result.V

        await locking.approve(validatorAddress)
        await locking.addToken(th.ZERO_ADDRESS, 10000, dec(1, 22), dec(1, 18))
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

    describe("test SequencerPool", async accounts => {
        it("test createSequencer()", async () => {
            await assertRevert(sequencerPool.create(pubkey, R, S, V, { from: alice }), "missing role")
            await assertRevert(sequencerPool.create(pubkey, R, S, V, { from: owner }), "SequencerPool: INVALID_AMOUNT")
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await sequencerPool.create(pubkey, R, S, V, { from: owner })
            let validator = await sequencerPool.validator()
            assert.equal(validator.toLowerCase(), validatorAddress.toLowerCase())

            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(1, 18).toString())
        });

        it("test createSequencer() with multi asset", async () => {
            await assertRevert(sequencerPool.create(pubkey, R, S, V, { from: alice }), "missing role")
            await assertRevert(sequencerPool.create(pubkey, R, S, V, { from: owner }), "SequencerPool: INVALID_AMOUNT")
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})

            // add goat token
            await locking.addToken(goat.address, 10000, dec(1, 22), dec(1, 18))
            await assertRevert(sequencerPool.create(pubkey, R, S, V, { from: owner }), "SequencerPool: INVALID_AMOUNT")

            await goatDeploymentHelper.deposit(goatDepositPool, sequencerPool.address, dec(1, 18))
            await sequencerPool.create(pubkey, R, S, V, { from: owner })

            let validator = await sequencerPool.validator()
            console.log("Validator: %s", validator)
            assert.equal(validator.toLowerCase(), validatorAddress.toLowerCase())

            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(1, 18).toString())
        });

        it("test lock()", async () => {
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await sequencerPool.create(pubkey, R, S, V, { from: owner })
            await assertRevert(sequencerPool.lock(alice, goat.address, dec(1, 18), true, { from: alice }), "GoatAccessController: only deposit pool")
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: owner, value: dec(1, 18) })
            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(2, 18).toString())
        });

        it("test bindExistSequencer()", async () => {
            await goatDeploymentHelper.deposit(depositPool, sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await sequencerPool.create(pubkey, R, S, V, { from: owner })
            await assertRevert(sequencerPool.lock(alice, goat.address, dec(1, 18), true, { from: alice }), "GoatAccessController: only deposit pool")
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: owner, value: dec(1, 18) })
            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(2, 18).toString())

            await sequencerPoolManager.createPool(0, 0, 0, { from: owner })
            let pool = new SequencerPool(await sequencerPoolManager.getPool(1))
            // change the owner of the validator
            await locking.changeValidatorOwner(validatorAddress, pool.address, { from: owner })
            await pool.bindExistsSequencer(validatorAddress, owner, { from: owner })
            await depositPool.partnerDeposit(pool.address, dec(1, 18), { from: owner, value: dec(1, 18) })
            lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            let partnerLockingAmount = await pool.userLocked(owner, PLATFORM_TOKEN_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(3, 18).toString())
            assert.equal(partnerLockingAmount.toString(), dec(3, 18).toString())
        });

        it("test lock() before create", async () => {
            await assertRevert(sequencerPool.lock(alice, goat.address, dec(1, 18), true, { from: alice }), "GoatAccessController: only deposit pool")
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await sequencerPool.addWhitelist(owner, { from: owner })
            for (let i = 0; i < 9; i++) {
                await depositPool.partnerDeposit(sequencerPool.address, dec(1, 17), { from: owner, value: dec(1, 17) })
                let balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
                assert.equal(balanceOfSequencerPool.toString(), dec(i + 1, 17).toString())
                let balanceOfLocking = await web3.eth.getBalance(locking.address)
                assert.equal(balanceOfLocking.toString(), 0)
            }
            await assertRevert(goatDeploymentHelper.create(locking, sequencerPool, { from: owner }), "SequencerPool: INVALID_AMOUNT")
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 17), { from: owner, value: dec(1, 17) })
            await sequencerPool.create(pubkey, R, S, V, { from: owner })
            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(1, 18).toString())
        });

        it("test unlock()", async () => {
            await sequencerPool.addWhitelist(owner, { from: owner })
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18)})
            await sequencerPool.create(pubkey, R, S, V, { from: owner })
            await assertRevert(sequencerPool.lock(alice, goat.address, dec(1, 18), true, { from: alice }), "GoatAccessController: only deposit pool")
            await assertRevert(depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: alice, value: dec(1, 18)}), "SequencerPool: NOT_WHITELISTED")
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { from: owner, value: dec(1, 18) })
            let lockingAmount = await locking.locking(validatorAddress, th.ZERO_ADDRESS)
            assert.equal(lockingAmount.toString(), dec(2, 18).toString())

            await assertRevert(depositPool.partnerWithdraw(sequencerPool.address, dec(3, 18), { from: owner }), "SequencerPool: INSUFFICIENT_BALANCE")
            await depositPool.partnerWithdraw(sequencerPool.address, dec(2, 18))
            await assertRevert(depositPool.partnerWithdraw(sequencerPool.address, dec(1, 17), { from: owner }), "SequencerPool: INSUFFICIENT_BALANCE")

            // not enough balance
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 17), { value: dec(1, 17) })
            let balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
            assert.equal(balanceOfSequencerPool.toString(), dec(1, 17).toString())

            // enough balance
            await depositPool.partnerDeposit(sequencerPool.address, dec(1, 18), { value: dec(1, 18) })
            balanceOfSequencerPool = await web3.eth.getBalance(sequencerPool.address)
            assert.equal(balanceOfSequencerPool.toString(), 0)
        });
    });
});
