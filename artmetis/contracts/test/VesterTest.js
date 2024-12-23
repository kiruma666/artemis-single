const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {json} = require("hardhat/internal/core/params/argumentTypes");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('Vester', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let mockOracle
    let vester
    let oMetis
    let usdt

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        mockOracle = contracts.mockOracle
        vester = contracts.vester
        oMetis = contracts.oMetis
        usdt = contracts.usdt
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

    describe("test vester", async accounts => {

        it("test addMetis", async () => {
            await assertRevert(vester.addMetis(dec(1, 18), { gasPrice:  0, from: alice, value: dec(1, 18) }), "missing role")
            await assertRevert(vester.addMetis(dec(1, 18), { gasPrice: 0, value: dec(2, 18) }), "Vester: invalid msg.value")
            let ownerBalanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            let balanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            await vester.addMetis(dec(1, 18), { gasPrice: 0, value: dec(1, 18) })
            let ownerBalanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            let balanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            assert.equal(ownerBalanceBefore.sub(ownerBalanceAfter).toString(), dec(1, 18))
            assert.equal(balanceAfter.sub(balanceBefore).toString(), dec(1, 18))
            assert.equal((await oMetis.balanceOf(owner)).toString(), dec(1, 18))
        });

        it("test vest()", async () => {
            await vester.addMetis(dec(1, 18), { gasPrice: 0, value: dec(1, 18) })
            assert.equal((await oMetis.balanceOf(owner)).toString(), dec(1, 18))

            await assertRevert(vester.vest(0, 1, { from: owner }), "Vester: invalid _amount")
            await assertRevert(vester.vest(dec(1, 18), 1, { from: owner }), "Vester: invalid _weeks")
            await assertRevert(vester.vest(dec(1, 18), 41, { from: owner }), "Vester: invalid _weeks")

            let balanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            assert.equal(balanceBefore.toString(), dec(1, 18))
            await assertRevert(vester.vest(dec(1, 16), 40, { gasPrice: 0, from: owner }), "ERC20: insufficient allowance")

            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 40, { gasPrice: 0, from: owner })

            let balanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            assert.equal(balanceAfter.toString(), dec(1, 18))

            let userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 1)
            assert.equal(userVestingPositions[0], 0)
            let now = await th.getLatestBlockTimestamp(web3)
            let vestingPosition = await vester.getVestingPosition(0)
            assert.equal(vestingPosition.user, owner)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 40)
            assert.equal(vestingPosition.start, now)
            assert.equal(vestingPosition.closed, false)


            // vest again
            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: owner })
            userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 2)
            assert.equal(userVestingPositions[0], 0)
            assert.equal(userVestingPositions[1], 1)
            now = await th.getLatestBlockTimestamp(web3)
            vestingPosition = await vester.getVestingPosition(1)
            assert.equal(vestingPosition.user, owner)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(vestingPosition.start, now)
            assert.equal(vestingPosition.closed, false)

            // transfer oMetis to alice
            await oMetis.transfer(alice, dec(1, 16), { from: owner })
            await oMetis.approve(vester.address, dec(1, 16), { from: alice })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: alice })

            userVestingPositions = await vester.getUserVestingPositions(alice)
            assert.equal(userVestingPositions.length, 1)
            assert.equal(userVestingPositions[0], 2)
            now = await th.getLatestBlockTimestamp(web3)
            vestingPosition = await vester.getVestingPosition(2)
            assert.equal(vestingPosition.user, alice)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(vestingPosition.start, now)
            assert.equal(vestingPosition.closed, false)

            // vest again
            await oMetis.approve(vester.address, dec(2, 16), { from: owner })
            await vester.vest(dec(2, 16), 2, { gasPrice: 0, from: owner })
            userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 3)
            assert.equal(userVestingPositions[0], 0)
            assert.equal(userVestingPositions[1], 1)
            assert.equal(userVestingPositions[2], 3)
            now = await th.getLatestBlockTimestamp(web3)
            vestingPosition = await vester.getVestingPosition(3)
            assert.equal(vestingPosition.user, owner)
            assert.equal(vestingPosition.amount.toString(), dec(2, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(vestingPosition.start, now)
            assert.equal(vestingPosition.closed, false)
        });

        it("test closeVestingPosition()", async () => {
            await vester.addMetis(dec(1, 18), { gasPrice: 0, value: dec(1, 18) })
            assert.equal((await oMetis.balanceOf(owner)).toString(), dec(1, 18))

            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: owner })
            let userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 1)
            assert.equal(userVestingPositions[0], 0)
            let now = await th.getLatestBlockTimestamp(web3)
            let vestingPosition = await vester.getVestingPosition(0)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(now, vestingPosition.start)
            assert.equal(vestingPosition.closed, false)

            let calcualtedAmount = await vester.calculateVestingAmount(vestingPosition.amount, vestingPosition.durationWeeks)
            let price = await mockOracle.getPrice()
            let usdtAmount = toBN(dec(1, 16)).mul(toBN(price)).mul(toBN(1000 - 25 * vestingPosition.durationWeeks)).div(toBN(1000)).div(toBN(dec(1, 30)))
            assert.equal(calcualtedAmount.toString(), usdtAmount.toString())

            await assertRevert(vester.closeVestingPosition(1, calcualtedAmount, { from: owner }), "Vester: invalid _vestId")

            await assertRevert(vester.closeVestingPosition(0, calcualtedAmount, { from: alice }), "Vester: invalid user")
            await assertRevert(vester.closeVestingPosition(0, calcualtedAmount, { from: owner }), "Vester: vesting position not matured")

            await th.fastForwardTime(2 * 7 * 24 * 60 * 60, web3.currentProvider)

            await usdt.mint(owner, calcualtedAmount)
            await usdt.approve(vester.address, calcualtedAmount, { from: alice })
            await assertRevert(vester.closeVestingPosition(0, calcualtedAmount, { from: alice }), "Vester: invalid user")

            await usdt.mint(owner, calcualtedAmount)
            await usdt.approve(vester.address, calcualtedAmount, { from: owner })

            let oMetisBalanceBefore = await oMetis.balanceOf(vester.address)
            let usdtBalanceBefore = await usdt.balanceOf(vester.address)
            let balanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            let balanceBeforeOwner = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            await vester.closeVestingPosition(0, calcualtedAmount, { gasPrice: 0, from: owner })
            let oMetisBalanceAfter = await oMetis.balanceOf(vester.address)
            let usdtBalanceAfter = await usdt.balanceOf(vester.address)
            let balanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            let balanceAfterOwner = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            assert.equal(oMetisBalanceBefore.sub(oMetisBalanceAfter).toString(), dec(1, 16))
            assert.equal(usdtBalanceAfter.sub(usdtBalanceBefore).toString(), calcualtedAmount)
            assert.equal(balanceBefore.sub(balanceAfter).toString(), dec(1, 16))
            assert.equal(balanceAfterOwner.sub(balanceBeforeOwner).toString(), dec(1, 16))

            userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 1)
            vestingPosition = await vester.getVestingPosition(0)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(now, vestingPosition.start)
            assert.equal(vestingPosition.closed, true)

            // close again
            await assertRevert(vester.closeVestingPosition(0, calcualtedAmount, { from: owner }), "Vester: vesting position already closed")

            // add another vesting position
            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 40, { gasPrice: 0, from: owner })
            userVestingPositions = await vester.getUserVestingPositions(owner)
            assert.equal(userVestingPositions.length, 2)
            assert.equal(userVestingPositions[0], 0)
            assert.equal(userVestingPositions[1], 1)
            now = await th.getLatestBlockTimestamp(web3)
            vestingPosition = await vester.getVestingPosition(1)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 40)
            assert.equal(now, vestingPosition.start)
            assert.equal(vestingPosition.closed, false)

            await th.fastForwardTime(40 * 7 * 24 * 60 * 60, web3.currentProvider)
            // close the second vesting position, and the amount should be 0
            balanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            balanceBeforeOwner = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            await vester.closeVestingPosition(1, 0, { gasPrice: 0, from: owner })
            balanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, vester.address)
            balanceAfterOwner = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, owner)
            assert.equal(balanceBefore.sub(balanceAfter).toString(), dec(1, 16))
            assert.equal(balanceAfterOwner.sub(balanceBeforeOwner).toString(), dec(1, 16))

            // alice vest again
            await oMetis.transfer(alice, dec(1, 16), { from: owner })
            await oMetis.approve(vester.address, dec(1, 16), { from: alice })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: alice })

            userVestingPositions = await vester.getUserVestingPositions(alice)
            assert.equal(userVestingPositions.length, 1)
            assert.equal(userVestingPositions[0], 2)
            now = await th.getLatestBlockTimestamp(web3)
            vestingPosition = await vester.getVestingPosition(2)
            assert.equal(vestingPosition.amount.toString(), dec(1, 16))
            assert.equal(vestingPosition.durationWeeks.toString(), 2)
            assert.equal(now, vestingPosition.start)
            assert.equal(vestingPosition.closed, false)

            // expire the vesting position
            await th.fastForwardTime(6 * 7 * 24 * 60 * 60, web3.currentProvider)

            // close the vesting position, and the vesting has expired, so the amount should be 0
            await assertRevert(vester.closeVestingPosition(2, calcualtedAmount, { from: alice }), "Vester: vesting position has expired")
        });

        it("test withdraw()", async () => {
            await vester.addMetis(dec(1, 18), { gasPrice: 0, value: dec(1, 18) })
            assert.equal((await oMetis.balanceOf(owner)).toString(), dec(1, 18))

            // vest 1
            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: owner })

            // vest 2
            await oMetis.approve(vester.address, dec(1, 16), { from: owner })
            await vester.vest(dec(1, 16), 2, { gasPrice: 0, from: owner })

            await th.fastForwardTime(2 * 7 * 24 * 60 * 60, web3.currentProvider)
            let calcualtedAmount = await vester.calculateVestingAmount(dec(1, 16), 2)
            await usdt.mint(owner, calcualtedAmount)
            await usdt.approve(vester.address, calcualtedAmount, { from: owner })
            await vester.closeVestingPosition(0, calcualtedAmount, { gasPrice: 0, from: owner })

            await th.fastForwardTime(4 * 7 * 24 * 60 * 60, web3.currentProvider)
            calcualtedAmount = await vester.calculateVestingAmount(dec(1, 16), 2)
            await usdt.mint(owner, calcualtedAmount)
            await usdt.approve(vester.address, calcualtedAmount, { from: owner })
            await assertRevert(vester.closeVestingPosition(1, calcualtedAmount, { from: owner }), "Vester: vesting position has expired")

            // withdraw
            await assertRevert(vester.withdraw(dec(1, 16), { from: alice }), "missing role")
            await vester.grantRole(AMTConstants.ADMIN_ROLE, alice)
            await assertRevert(vester.withdraw(dec(1, 18), { from: alice }), "Vester: amount exceeds balance")
            let balanceBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            let usdtBalanceBefore = await usdt.balanceOf(alice)
            await vester.withdraw(dec(1, 16), { gasPrice: 0, from: alice })
            let balanceAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            let usdtBalanceAfter = await usdt.balanceOf(alice)
            assert.equal(balanceAfter.sub(balanceBefore).toString(), dec(1, 16))
            assert.equal(usdtBalanceAfter.sub(usdtBalanceBefore).toString(), calcualtedAmount)
        });
    });
});
