const deploymentHelper = require("../../utils/deploymentHelpers.js")
const goatDeploymentHelper = require("./GoatDeploymentHelper.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

contract('BaseRewardPool', async accounts => {
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
    let config

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
        config = contracts.config

        await locking.addToken(th.ZERO_ADDRESS, 10000, dec(1, 22), dec(1, 18))
        await config.addDistributor(owner)

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

    describe("test BaseRewardPool", async accounts => {
        it("test add reward with only distributor", async () => {
            await assertRevert(artGoatRewardPool.addReward(goat.address, dec(1, 18), { from: alice}), "GoatAccessController: only distributor")
        });

        it("test pending reward with no stake", async () => {
            await assertRevert(artGoatRewardPool.addReward(goat.address, dec(1, 18)), "invalid reward token")
            await assertRevert(artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18)), "invalid amount")
            await assertRevert(artBtcRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18)), "invalid reward token")

            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })
            let pending = (await artGoatRewardPool.rewards(PLATFORM_TOKEN_ADDRESS)).queuedRewards
            let balance = await web3.eth.getBalance(artGoatRewardPool.address)
            assert.equal(pending, dec(1, 18))
            assert.equal(balance, dec(1, 18))

            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })
            pending = (await artGoatRewardPool.rewards(PLATFORM_TOKEN_ADDRESS)).queuedRewards
            balance = await web3.eth.getBalance(artGoatRewardPool.address)
            assert.equal(pending, dec(2, 18))
            assert.equal(balance, dec(2, 18))
        });

        it("test basic info", async () => {
            let artToken = await artGoatRewardPool.stakingToken()
            let rewardToken = await artGoatRewardPool.rewardTokens(0)

            let reward = await artGoatRewardPool.rewards(rewardToken)

            assert.equal(artToken, artGoat.address)
            assert.equal(rewardToken, PLATFORM_TOKEN_ADDRESS)
            assert.equal(reward.rewardPerTokenStored, 0)
            assert.equal(reward.queuedRewards, 0)

            artToken = await artBtcRewardPool.stakingToken()
            rewardToken = await artBtcRewardPool.rewardTokens(0)
            reward = await artGoatRewardPool.rewards(rewardToken)

            assert.equal(artToken, artBTC.address)
            assert.equal(rewardToken, goat.address)
            assert.equal(reward.rewardPerTokenStored, 0)
            assert.equal(reward.queuedRewards, 0)
        });

        it("test basic info", async () => {
            let userInfo = await artGoatRewardPool.userRewards(owner, PLATFORM_TOKEN_ADDRESS)
            let balanceOf = await artGoatRewardPool.balanceOf(owner)
            assert.equal(balanceOf, 0)
            assert.equal(userInfo.userRewardPerTokenPaid, 0)
            assert.equal(userInfo.rewards, 0)

            await artGoat.mint(owner, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18))
            await artGoatRewardPool.stake(dec(1, 18))

            let rewardToken = await artGoatRewardPool.rewardTokens(0)
            let reward = await artGoatRewardPool.rewards(rewardToken)
            balanceOf = await artGoatRewardPool.balanceOf(owner)

            assert.equal(reward.rewardPerTokenStored, 0)
            assert.equal(reward.queuedRewards, 0)
            assert.equal(balanceOf, dec(1, 18))

            userInfo = await artGoatRewardPool.userRewards(owner, rewardToken)
            assert.equal(userInfo.userRewardPerTokenPaid, 0)
            assert.equal(userInfo.rewards, 0)
        });

        it("test reward comes", async () => {
            await artGoat.mint(alice, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: alice })
            await artGoatRewardPool.stake(dec(1, 18), { from: alice })

            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })
            let rewardToken = await artGoatRewardPool.rewardTokens(0)
            let reward = await artGoatRewardPool.rewards(rewardToken)
            let totalSupply = await artGoatRewardPool.totalSupply()

            assert.equal(reward.rewardPerTokenStored, dec(1, 18))
            assert.equal(reward.queuedRewards, 0)
            assert.equal(totalSupply, dec(1, 18))

            let userInfo = await artGoatRewardPool.userRewards(alice, rewardToken)
            let balanceOf = await artGoatRewardPool.balanceOf(alice)
            assert.equal(balanceOf, dec(1, 18))
            assert.equal(userInfo.userRewardPerTokenPaid, 0)
            assert.equal(userInfo.rewards, 0)

            await artGoat.mint(bob, dec(2, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(2, 18), { from: bob })
            await artGoatRewardPool.stake(dec(2, 18), { from: bob })
            let bobUserInfo = await artGoatRewardPool.userRewards(bob, rewardToken)
            let bobBalanceOf = await artGoatRewardPool.balanceOf(bob)
            assert.equal(bobBalanceOf, dec(2, 18))
            assert.equal(bobUserInfo.rewards, 0)
            assert.equal(bobUserInfo.userRewardPerTokenPaid, dec(1, 18))

            await artGoat.mint(alice, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: alice })
            await artGoatRewardPool.stake(dec(1, 18), { from: alice })
            userInfo = await artGoatRewardPool.userRewards(alice, rewardToken)
            balanceOf = await artGoatRewardPool.balanceOf(alice)
            assert.equal(balanceOf, dec(2, 18))
            assert.equal(userInfo.rewards, dec(1, 18))
            assert.equal(userInfo.userRewardPerTokenPaid, dec(1, 18))

            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })
            reward = await artGoatRewardPool.rewards(rewardToken)
            totalSupply = await artGoatRewardPool.totalSupply()
            assert.equal(reward.queuedRewards, 0)
            assert.equal(reward.rewardPerTokenStored, dec(125, 16))
            assert.equal(totalSupply, dec(4, 18))

            await artGoat.mint(bob, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: bob })
            await artGoatRewardPool.stake(dec(1, 18), { from: bob })
            bobUserInfo = await artGoatRewardPool.userRewards(bob, rewardToken)
            bobBalanceOf = await artGoatRewardPool.balanceOf(bob)
            assert.equal(bobBalanceOf, dec(3, 18))
            assert.equal(bobUserInfo.rewards, dec(5, 17))
            assert.equal(toBN(bobUserInfo.userRewardPerTokenPaid).toString(), dec(125, 16))
        });

        it("test unlock", async () => {
            await artGoat.mint(alice, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: alice })
            let goatBalanceBefore = await artGoat.balanceOf(alice)
            await artGoatRewardPool.stake(dec(1, 18), { from: alice })
            let goatBalanceAfter = await artGoat.balanceOf(alice)
            assert.equal(goatBalanceBefore - goatBalanceAfter, dec(1, 18))
            assert.equal(goatBalanceAfter, 0)

            goatBalanceBefore = await artGoat.balanceOf(alice)
            await artGoatRewardPool.withdraw(dec(1, 18), { from: alice })
            goatBalanceAfter = await artGoat.balanceOf(alice)
            assert.equal(goatBalanceAfter - goatBalanceBefore, dec(1, 18))
            assert.equal(goatBalanceAfter, dec(1, 18))
            let userInfo = await artGoatRewardPool.userRewards(alice, PLATFORM_TOKEN_ADDRESS)
            let balanceOf = await artGoatRewardPool.balanceOf(alice)
            assert.equal(balanceOf, 0)
            assert.equal(userInfo.rewards, 0)
            assert.equal(userInfo.userRewardPerTokenPaid, 0)

            await artGoat.mint(alice, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: alice })
            await artGoatRewardPool.stake(dec(1, 18), { from: alice })
            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })

            let balanceBefore = await web3.eth.getBalance(alice)
            await artGoatRewardPool.withdraw(dec(1, 18), { from: alice, gasPrice: 0})
            let balanceAfter = await web3.eth.getBalance(alice)
            userInfo = await artGoatRewardPool.userRewards(alice, PLATFORM_TOKEN_ADDRESS)
            balanceOf = await artGoatRewardPool.balanceOf(alice)
            assert.equal(balanceOf, 0)
            assert.equal(userInfo.userRewardPerTokenPaid, dec(1, 18))
            assert.equal(userInfo.rewards, 0)
            assert.equal(balanceAfter - balanceBefore, dec(1, 18))
        });

        it("test claimReward()", async () => {
            await artGoat.mint(alice, dec(1, 18))
            await artGoat.approve(artGoatRewardPool.address, dec(1, 18), { from: alice })
            await artGoatRewardPool.stake(dec(1, 18), { from: alice })

            await artGoatRewardPool.addReward(PLATFORM_TOKEN_ADDRESS, dec(1, 18), { value: dec(1, 18) })

            let balanceBefore = await web3.eth.getBalance(alice)
            await artGoatRewardPool.claimReward({ from: alice, gasPrice: 0 })
            let balanceAfter = await web3.eth.getBalance(alice)
            assert.equal(balanceAfter - balanceBefore, dec(1, 18))
            let userInfo = await artGoatRewardPool.userRewards(alice, PLATFORM_TOKEN_ADDRESS)
            let balanceOf = await artGoatRewardPool.balanceOf(alice)
            assert.equal(balanceOf, dec(1, 18))
            assert.equal(userInfo.rewards, 0)
            assert.equal(userInfo.userRewardPerTokenPaid, dec(1, 18))
        });
    });
});
