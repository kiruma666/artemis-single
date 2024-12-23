const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('OMetis', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let oMetis

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        oMetis = contracts.oMetis
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

    describe("test OMetis", async accounts => {

        it("deploy name/symbol", async () => {
            assert.equal(await oMetis.name(), "OMetis Token")
            assert.equal(await oMetis.symbol(), "OMETIS")
            assert.equal(await oMetis.decimals(), 18)
        });

        it("test mint/burn", async () => {
            await assertRevert(oMetis.mint(bob, dec(100, 18), { from: alice }), "missing role")

            await oMetis.grantRole(AMTConstants.MINTER_ROLE, alice)
            await oMetis.mint(bob, dec(100, 18), { from: alice })

            assert.equal(await oMetis.balanceOf(bob), dec(100, 18))

            await assertRevert(oMetis.burn(bob, dec(100, 18), { from: alice }), "missing role")

            await oMetis.grantRole(AMTConstants.BURNER_ROLE, alice)
            await oMetis.burn(bob, dec(100, 18), { from: alice })

            assert.equal(await oMetis.balanceOf(bob), 0)
        });

    });
});