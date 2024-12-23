const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('AMTDepositPool', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let contracts
    let artMetis
    let rewardPool
    let depositPool
    let amtConfig

    const deploy = async () => {
        contracts = await deploymentHelper.deploy()
        artMetis = contracts.artMetis
        rewardPool = contracts.rewardPool
        depositPool = contracts.depositPool
        amtConfig = contracts.amtConfig
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

    describe("test amt config", async accounts => {
        it("test set contract", async () => {
            await assertRevert(amtConfig.setContract(AMTConstants.ART_METIS, alice, { from: alice }), "missing role")
            await assertRevert(amtConfig.setContract(AMTConstants.ART_METIS, th.ZERO_ADDRESS, { from: owner }), "invalid _contractAddress!")
            await amtConfig.setContract(AMTConstants.ART_METIS, alice, { from: owner })
            let contractAddress = await amtConfig.getContract(AMTConstants.ART_METIS)
            assert.equal(contractAddress, alice)
        });
    });
});
