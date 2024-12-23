const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../../utils/AMTConstants.js").AMTConstants

contract('StakingPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let l1Token
    let lockingPool
    let lockingInfo
    let stakingPoolManager
    let l1ERC20Bridge
    let stakingPool
    let rewardReceipt
    let stakingPoolBeaconProxy
    let l2DepositPool

    const deploy = async () => {
        contracts = await deploymentHelper.deployL1()
        l1Token = contracts.l1Token
        lockingPool = contracts.lockingPool
        lockingInfo = contracts.lockingInfo
        stakingPoolManager = contracts.stakingPoolManager
        stakingPool = contracts.stakingPool
        rewardReceipt = contracts.rewardReceipt
        stakingPoolBeaconProxy = contracts.stakingPoolBeaconProxy
        l1ERC20Bridge = contracts.l1ERC20Bridge
        l2DepositPool = contracts.l2DepositPool

        await l1Token.mint(owner, dec(1, 24))
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

    describe("test StakingPoolManager & StakingPool", async accounts => {
        it("test staking pool read function", async () => {
            assert.equal(await stakingPool.stakingAmount(), 0)
            assert.equal(await stakingPool.canStake(dec(1, 18)), false)
        });

        it("test StakingPoolManager l1Token", async () => {
            assert.equal(await stakingPoolManager.l1Token(), l1Token.address)
        });

        it("test StakePoolManager setParams", async () => {
            await assertRevert(stakingPoolManager.setParams(th.ZERO_ADDRESS, th.ZERO_ADDRESS, th.ZERO_ADDRESS, {from: alice}), "missing role")
        });

        it("test StakingPoolManager create pool", async () => {
            await assertRevert(stakingPoolManager.createPool({from: alice}), "missing role")
            await stakingPoolManager.createPool({from: owner})
            assert.equal(await stakingPoolManager.getPoolCount(), 2)
            assert.equal(await stakingPoolManager.getPool(0), stakingPool.address)
        });

        it("test StakingPoolManager add pool", async () => {
            await assertRevert(stakingPoolManager.addPool(stakingPool.address, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.addPool(stakingPool.address, {from: owner}), "StakingPoolManager: pool already exists")
        });

        it("test StakingPoolManager bind pool with sequencer", async () => {
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, 0x0, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, th.ZERO_ADDRESS, 0x01, {from: owner}), "StakingPool: invalid signer")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x', {from: owner}), "StakingPool: invalid signer pub key")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "StakingPool: invalid amount")

            await l1Token.mint(stakingPoolManager.address, dec(19, 21))
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "StakingPool: invalid amount")
            await l1Token.mint(stakingPoolManager.address, dec(1, 21))

            // not in the white list
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "")
            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})

            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(2, 22))
            let sequencer = await lockingPool.sequencers(await lockingPool.seqOwners(stakingPool.address))
            assert.equal(sequencer.signer, carol)

            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "StakingPool: sequencer already binded")
        });

        it("test StakingPoolManager unlock sequencer", async () => {
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, 0x0, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, th.ZERO_ADDRESS, 0x01, {from: owner}), "StakingPool: invalid signer")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x', {from: owner}), "StakingPool: invalid signer pub key")
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "StakingPool: invalid amount")

            await l1Token.mint(stakingPoolManager.address, dec(19, 21))
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "StakingPool: invalid amount")
            await l1Token.mint(stakingPoolManager.address, dec(1, 21))

            // not in the white list
            await assertRevert(stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner}), "")
            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})

            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(2, 22))
            let sequencer = await lockingPool.sequencers(await lockingPool.seqOwners(stakingPool.address))
            assert.equal(sequencer.signer, carol)

            await stakingPoolManager.unlockSequencerInitialize(stakingPool.address, 0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(2, 22))

            await assertRevert(stakingPoolManager.unlockSequencerFinalize(stakingPool.address, 0, {from: owner}), 'Not allowed to cliam')
            // forward 20 days
            await th.fastForwardTime(20 * 24 * 3600, web3.currentProvider)
            await assertRevert(stakingPoolManager.unlockSequencerFinalize(stakingPool.address, 0, {from: owner}), 'Not allowed to cliam')

            // forward 1 days
            await th.fastForwardTime(24 * 3600, web3.currentProvider)
            await stakingPoolManager.unlockSequencerFinalize(stakingPool.address, 0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), dec(2, 22))
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), 0)
        });

        it("test StakingPoolManager remove pool", async () => {
            await assertRevert(stakingPoolManager.removePool(stakingPool.address, {from: alice}), "missing role")
            await stakingPoolManager.removePool(stakingPool.address, {from: owner})
            await assertRevert(stakingPoolManager.removePool(stakingPool.address, {from: owner}), "StakingPoolManager: pool not exists")
        })

        it("test StakingPoolManager stake", async () => {
            await assertRevert(stakingPoolManager.stake(stakingPool.address, 0, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.stake(alice, 0, {from: owner}), "StakingPoolManager: pool not exists")

            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})
            await l1Token.mint(stakingPoolManager.address, dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})

            // no amount to stake
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            await stakingPoolManager.stake(stakingPool.address, 0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)

            // mint 1e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(1, 22))
            await stakingPoolManager.stake(stakingPool.address, dec(1, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(3, 22))

            // mint 7e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(7, 22))
            await stakingPoolManager.stake(stakingPool.address, dec(7, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(10, 22))

            // mint 1e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(1, 22))
            await assertRevert(stakingPoolManager.stake(stakingPool.address, dec(1, 22), {from: owner}), "StakingPoolManager: cannot stake")
        })

        it("test StakingPoolManager withdraw", async () => {
            await assertRevert(stakingPoolManager.withdraw(stakingPool.address, l2DepositPool.address, 0, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.withdraw(alice, l2DepositPool.address, 0, {from: owner}), "StakingPoolManager: pool not exists")

            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})
            await l1Token.mint(stakingPoolManager.address, dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})

            // no amount to stake
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            await stakingPoolManager.stake(stakingPool.address, 0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)

            // mint 1e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(1, 22))
            await stakingPoolManager.stake(stakingPool.address, dec(1, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(3, 22))

            await assertRevert(stakingPoolManager.withdraw(stakingPool.address, th.ZERO_ADDRESS, dec(1, 22), {from: owner}), 'StakingPool: invalid recipient')

            // withdraw 1e22
            await stakingPoolManager.withdraw(stakingPool.address, l2DepositPool.address, dec(1, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(2, 22))
            assert.equal(await th.getAssetBalance(l1Token.address, l1ERC20Bridge.address), dec(1, 22))
            assert.equal(await l1ERC20Bridge.l2Balances(l2DepositPool.address), dec(1, 22))

            // withdraw 1e18
            await assertRevert(stakingPoolManager.withdraw(stakingPool.address, l2DepositPool.address, dec(1, 18), {from: owner}), 'StakingPool: exceed min lock')
        });

        it("test StakingPoolManager withdraw to manager", async () => {
            await assertRevert(stakingPoolManager.withdrawToManager(stakingPool.address, 0, {from: alice}), "missing role")
            await assertRevert(stakingPoolManager.withdrawToManager(alice, 0, {from: owner}), "StakingPoolManager: pool not exists")

            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})
            await l1Token.mint(stakingPoolManager.address, dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})

            // no amount to stake
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            await stakingPoolManager.stake(stakingPool.address, 0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)

            // mint 1e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(1, 22))
            await stakingPoolManager.stake(stakingPool.address, dec(1, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(3, 22))

            // withdraw 1e22
            await stakingPoolManager.withdrawToManager(stakingPool.address, dec(1, 22), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(2, 22))
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), dec(1, 22))

            // withdraw 1e18
            await assertRevert(stakingPoolManager.withdrawToManager(stakingPool.address, dec(1, 18), {from: owner}), 'StakingPool: exceed min lock')
        });

        it("test StakingPoolManager claim rewards", async () => {
            await assertRevert(stakingPoolManager.claimRewards(0, {from: alice}), "missing role")

            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})
            await l1Token.mint(stakingPoolManager.address, dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})

            // no rewards to claim
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            await stakingPoolManager.claimRewards(0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)

            // add rewards to locking pool
            await l1Token.mint(owner, dec(1, 22))
            await l1Token.approve(lockingInfo.address, dec(1, 22), {from: owner})
            // batchSubmitRewards called will transfer 1e22 to locking pool
            await lockingPool.batchSubmitRewards(0, 0, 0, [carol], [1], {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(3, 22))

            // claim rewards
            assert.equal(await stakingPoolManager.getRewards(stakingPool.address), dec(1, 22))
            await stakingPoolManager.claimRewards(0, {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal((await th.getAssetBalance(l1Token.address, lockingInfo.address)).toString(), dec(2, 22))
            // reward receipt balance
            assert.equal(await th.getAssetBalance(l1Token.address, rewardReceipt.address), dec(1, 22))
        })

        it("test stake with staking pool", async () => {
            await lockingPool.setWhitelist(stakingPool.address, true, {from: owner})
            await l1Token.mint(stakingPoolManager.address, dec(2, 22))
            await stakingPoolManager.bindSequencerFor(stakingPool.address, carol, '0x0', {from: owner})

            // mint 1e22 and stake
            await l1Token.mint(stakingPoolManager.address, dec(1, 22))
            await stakingPoolManager.stake(stakingPool.address, dec(5, 21), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), dec(5, 21))
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(25, 21))
            await stakingPoolManager.stake(stakingPool.address, dec(5, 21), {from: owner})
            assert.equal(await th.getAssetBalance(l1Token.address, stakingPoolManager.address), 0)
            assert.equal(await th.getAssetBalance(l1Token.address, lockingInfo.address), dec(3, 22))

        })
    });
});
