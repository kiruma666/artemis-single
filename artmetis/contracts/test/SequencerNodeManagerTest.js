const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const {web3} = require("@openzeppelin/test-helpers/src/setup");
const SequencerNodeManger =  artifacts.require('SequencerNodeManager')

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const AMTConstants = require("../utils/AMTConstants.js").AMTConstants

contract('SequencerNodeManager', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let sequencerNodeManager

    const deploy = async () => {
        sequencerNodeManager = await deploymentHelper.deployUpgradeableContract(SequencerNodeManger)
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

    describe("test sequencer node manager", async accounts => {
        it("test set contract", async () => {
            await assertRevert(sequencerNodeManager.setUrl(alice, "https://alice.com", { from: alice }), "missing role")
            await assertRevert(sequencerNodeManager.setUrl(th.ZERO_ADDRESS, "https://alice.com", { from: owner }), "invalid _sequencer!")
            await sequencerNodeManager.setUrl(alice, "https://alice.com", { from: owner })
            await assertRevert(sequencerNodeManager.setUrl(alice, "https://alice.com", { from: owner }), "_sequencer already set!")
            let url = await sequencerNodeManager.getUrl(alice)
            console.log("url is " + url)
            assert.equal(url, "https://alice.com")
        });
    });
});
