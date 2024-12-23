const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");
const SequencerPool = artifacts.require('SequencerPool.sol')

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

contract('SequencerPoolManager', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let sequencerPool
    let locking
    let sequencerPoolManager

    const deploy = async () => {
        contracts = await deploymentHelper.deployGoat()
        sequencerPool = contracts.sequencerPool
        locking = contracts.locking
        sequencerPoolManager = contracts.sequencerPoolManager
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

    describe("test SequencerPoolManager", async accounts => {
        it("test create()", async () => {
            await assertRevert(sequencerPoolManager.createPool(0, 0, 0, { from: alice }), "missing role")
            await sequencerPoolManager.createPool(0, 0, 0, { from: owner })
            let pool = new SequencerPool(await sequencerPoolManager.getPool(1))
            assert.equal(pool.address, await sequencerPoolManager.getPool(1))
        });

        it("test get func", async () => {
            let count = await sequencerPoolManager.getPoolCount()
            let pool = await sequencerPoolManager.getPool(0)
            assert.equal(count, 1)
            assert.equal(pool, sequencerPool.address)

            await sequencerPoolManager.createPool(0, 0, 0, { from: owner })
            count = await sequencerPoolManager.getPoolCount()
            assert.equal(count, 2)
        });

        it("test operate()", async () => {
            await assertRevert(sequencerPoolManager.removePool(th.ZERO_ADDRESS, { from: alice }), "missing role")
            await assertRevert(sequencerPoolManager.removePool(th.ZERO_ADDRESS, { from: owner }), "SequencerPoolManager: INVALID_POOL")
            await sequencerPoolManager.removePool(sequencerPool.address, { from: owner })
            await assertRevert(sequencerPoolManager.removePool(sequencerPool.address, { from: owner }), "SequencerPoolManager: POOL_NOT_EXISTS")

            let count = await sequencerPoolManager.getPoolCount()
            assert.equal(count, 0)

            await assertRevert(sequencerPoolManager.addPool(th.ZERO_ADDRESS, { from: alice }), "missing role")
            await assertRevert(sequencerPoolManager.addPool(th.ZERO_ADDRESS, { from: owner }), "SequencerPoolManager: INVALID_POOL")
            await sequencerPoolManager.addPool(sequencerPool.address, { from: owner })
            await assertRevert(sequencerPoolManager.addPool(sequencerPool.address, { from: owner }), "SequencerPoolManager: POOL_EXISTS")

            count = await sequencerPoolManager.getPoolCount()
            assert.equal(count, 1)
        });
    });
});
