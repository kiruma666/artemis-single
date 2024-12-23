const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('ArtMetis', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let artMetis

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        artMetis = contracts.artMetis
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

    describe("test artMetis", async accounts => {

        it("deploy name/symbol", async () => {
            assert.equal(await artMetis.name(), "Staked Metis Token")
            assert.equal(await artMetis.symbol(), "artMETIS")
            assert.equal(await artMetis.decimals(), 18)
        });

        it("test mint/burn", async () => {
            await assertRevert(artMetis.mint(bob, dec(100, 18), { from: alice }), "missing role")

            await artMetis.grantRole(AMTConstants.MINTER_ROLE, alice)
            await artMetis.mint(bob, dec(100, 18), { from: alice })

            assert.equal(await artMetis.balanceOf(bob), dec(100, 18))

            await assertRevert(artMetis.burn(bob, dec(100, 18), { from: alice }), "missing role")

            await artMetis.grantRole(AMTConstants.BURNER_ROLE, alice)
            await artMetis.burn(bob, dec(100, 18), { from: alice })

            assert.equal(await artMetis.balanceOf(bob), 0)
        });

    });
});