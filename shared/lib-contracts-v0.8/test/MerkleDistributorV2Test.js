const MerkleDistributorV2 = artifacts.require('MerkleDistributorV2')
const ERC20Mock = artifacts.require('ERC20Mock')

const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const StandardMerkleTree = require("@openzeppelin/merkle-tree").StandardMerkleTree

const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert

const deployUpgradeableContract = async (artifact, ...args) => {
    const contractFactory = await ethers.getContractFactory(artifact.contractName)
    const contract = await upgrades.deployProxy(contractFactory, args)
    return new artifact(contract.address)
};

contract('MerkleDistributorV2', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let mockToken
    let merkleDistributorV2

    const deploy = async () => {
        mockToken = await ERC20Mock.new('USD Coin', 'USDC')
        merkleDistributorV2 = await deployUpgradeableContract(MerkleDistributorV2, owner)
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

    describe("test MerkleDistributorV2", async accounts => {

        it("test setMerkleRootAndFund", async () => {
            const amounts = [
                [alice, [dec(2, 18), dec(1, 18)]],
                [bob, [dec(1, 18), dec(2, 18)]],
            ]
            const tree = StandardMerkleTree.of(amounts, ["address", "uint256[]"])

            // missing role
            await assertRevert(merkleDistributorV2.setMerkleRootAndFund(tree.root, [PLATFORM_TOKEN_ADDRESS, mockToken.address], [dec(3, 18), dec(3, 18)], { from: alice }), "missing role")

            // grant role
            await merkleDistributorV2.grantRole(await merkleDistributorV2.ADMIN_ROLE(), alice)

            await mockToken.mint(alice, dec(3, 18))
            await mockToken.approve(merkleDistributorV2.address, dec(3, 18), { from: alice })
            await merkleDistributorV2.setMerkleRootAndFund(tree.root, [PLATFORM_TOKEN_ADDRESS, mockToken.address], [dec(3, 18), dec(3, 18)], { from: alice, value: dec(3, 18), gasPrice: 0 })

            assert.equal(await merkleDistributorV2.merkleRoot(), tree.root)
            assert.equal(await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, merkleDistributorV2.address), dec(3, 18))
            assert.equal(await mockToken.balanceOf(merkleDistributorV2.address), dec(3, 18))
        });

        it("test claim", async () => {
            let amounts = [
                [alice, [dec(2, 18), dec(1, 18)]],
                [bob, [dec(1, 18), dec(2, 18)]],
            ]
            let tree = StandardMerkleTree.of(amounts, ["address", "uint256[]"])

            // grant role
            await merkleDistributorV2.grantRole(await merkleDistributorV2.ADMIN_ROLE(), alice)

            await mockToken.mint(alice, dec(3, 18))
            await mockToken.approve(merkleDistributorV2.address, dec(3, 18), { from: alice })
            await merkleDistributorV2.setMerkleRootAndFund(tree.root, [PLATFORM_TOKEN_ADDRESS, mockToken.address], [dec(3, 18), dec(3, 18)], { from: alice, value: dec(3, 18), gasPrice: 0 })

            // carol cannot claim
            await assertRevert(merkleDistributorV2.claim([dec(2, 18), dec(1, 18)], tree.getProof([alice, [dec(2, 18), dec(1, 18)]]), { from: carol }), "invalid proof")

            // bob claim
            let bobBalBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            await merkleDistributorV2.claim([dec(1, 18), dec(2, 18)], tree.getProof([bob, [dec(1, 18), dec(2, 18)]]), { from: bob, gasPrice: 0 })
            let bobBalAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            assert.equal(bobBalAfter.sub(bobBalBefore).toString(), dec(1, 18))
            assert.equal(await mockToken.balanceOf(bob), dec(2, 18))

            // claim again, get nothing
            await merkleDistributorV2.claim([dec(1, 18), dec(2, 18)], tree.getProof([bob, [dec(1, 18), dec(2, 18)]]), { from: bob, gasPrice: 0 })
            bobBalAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            assert.equal(bobBalAfter.sub(bobBalBefore).toString(), dec(1, 18))
            assert.equal(await mockToken.balanceOf(bob), dec(2, 18))

            // fund again
            amounts = [
                [alice, [dec(2, 18), dec(1, 18)]],
                [bob, [dec(1, 18), dec(3, 18)]],
                [carol, [dec(3, 18), dec(3, 18)]],
            ]
            tree = StandardMerkleTree.of(amounts, ["address", "uint256[]"])

            await mockToken.mint(alice, dec(4, 18))
            await mockToken.approve(merkleDistributorV2.address, dec(4, 18), { from: alice })
            await merkleDistributorV2.setMerkleRootAndFund(tree.root, [PLATFORM_TOKEN_ADDRESS, mockToken.address], [dec(3, 18), dec(4, 18)], { from: alice, value: dec(3, 18), gasPrice: 0 })

            // alice claim
            let aliceBalBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            await merkleDistributorV2.claim([dec(2, 18), dec(1, 18)], tree.getProof([alice, [dec(2, 18), dec(1, 18)]]), { from: alice, gasPrice: 0 })
            let aliceBalAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, alice)
            assert.equal(aliceBalAfter.sub(aliceBalBefore).toString(), dec(2, 18))
            assert.equal(await mockToken.balanceOf(alice), dec(1, 18))

            // bob claim
            await merkleDistributorV2.claim([dec(1, 18), dec(3, 18)], tree.getProof([bob, [dec(1, 18), dec(3, 18)]]), { from: bob, gasPrice: 0 })
            bobBalAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, bob)
            assert.equal(bobBalAfter.sub(bobBalBefore).toString(), dec(1, 18))
            assert.equal(await mockToken.balanceOf(bob), dec(3, 18))

            // carol claim
            let carolBalBefore = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, carol)
            await merkleDistributorV2.claim([dec(3, 18), dec(3, 18)], tree.getProof([carol, [dec(3, 18), dec(3, 18)]]), { from: carol, gasPrice: 0 })
            let carolBalAfter = await th.getAssetBalance(PLATFORM_TOKEN_ADDRESS, carol)
            assert.equal(carolBalAfter.sub(carolBalBefore).toString(), dec(3, 18))
            assert.equal(await mockToken.balanceOf(carol), dec(3, 18))
        });

    });
});