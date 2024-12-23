const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('Oracle', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let mockOracle

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        mockOracle = contracts.mockOracle
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

    describe("test oracle", async accounts => {

        it("get price", async () => {
            const price = await mockOracle.getPrice()
            assert.equal(price, dec(100, 18))
        });

    });
});
