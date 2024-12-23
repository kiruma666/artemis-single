const MerkleDistributor = artifacts.require('MerkleDistributor')
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

contract('MerkleDistributor', async accounts => {
    let [owner, alice, bob, carol] = accounts

    let mockToken
    let merkleDistributor

    const deploy = async () => {
        mockToken = await ERC20Mock.new('USD Coin', 'USDC')
        merkleDistributor = await deployUpgradeableContract(MerkleDistributor, mockToken.address)
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

    describe("test MerkleDistributor", async accounts => {

        it("test setMerkleRootAndFund", async () => {
            const amounts = [
                [alice, dec(1, 18)],
                [bob, dec(2, 18)],
            ]
            const tree = StandardMerkleTree.of(amounts, ["address", "uint256"])

            // missing role
            await assertRevert(merkleDistributor.setMerkleRootAndFund(tree.root, dec(3, 18), { from: alice }), "missing role")

            // grant role
            await merkleDistributor.grantRole(await merkleDistributor.ADMIN_ROLE(), alice)

            await mockToken.mint(alice, dec(3, 18))
            await mockToken.approve(merkleDistributor.address, dec(3, 18), { from: alice })
            await merkleDistributor.setMerkleRootAndFund(tree.root, dec(3, 18), { from: alice })

            assert.equal(await merkleDistributor.merkleRoot(), tree.root)
            assert.equal(await mockToken.balanceOf(merkleDistributor.address), dec(3, 18))
        });

        it("test claim", async () => {
            let amounts = [
                [alice, dec(1, 18)],
                [bob, dec(2, 18)],
            ]
            let tree = StandardMerkleTree.of(amounts, ["address", "uint256"])

            // grant role
            await merkleDistributor.grantRole(await merkleDistributor.ADMIN_ROLE(), alice)

            await mockToken.mint(alice, dec(3, 18))
            await mockToken.approve(merkleDistributor.address, dec(3, 18), { from: alice })
            await merkleDistributor.setMerkleRootAndFund(tree.root, dec(3, 18), { from: alice })

            // carol cannot claim
            await assertRevert(merkleDistributor.claim(dec(1, 18), tree.getProof([alice, dec(1, 18)]), { from: carol }), "invalid proof")

            // bob claim
            await merkleDistributor.claim(dec(2, 18), tree.getProof([bob, dec(2, 18)]), { from: bob })
            assert.equal(await mockToken.balanceOf(bob), dec(2, 18))

            // cannot claim twice
            await assertRevert(merkleDistributor.claim(dec(2, 18), tree.getProof([bob, dec(2, 18)]), { from: bob }), "nothing to claim")

            // fund again
            amounts = [
                [alice, dec(1, 18)],
                [bob, dec(3, 18)],
                [carol, dec(3, 18)],
            ]
            tree = StandardMerkleTree.of(amounts, ["address", "uint256"])

            await mockToken.mint(alice, dec(5, 18))
            await mockToken.approve(merkleDistributor.address, dec(5, 18), { from: alice })
            await merkleDistributor.setMerkleRootAndFund(tree.root, dec(5, 18), { from: alice })

            // alice claim
            await merkleDistributor.claim(dec(1, 18), tree.getProof([alice, dec(1, 18)]), { from: alice })
            assert.equal(await mockToken.balanceOf(alice), dec(1, 18))

            // bob claim
            await merkleDistributor.claim(dec(3, 18), tree.getProof([bob, dec(3, 18)]), { from: bob })
            assert.equal(await mockToken.balanceOf(bob), dec(3, 18))

            // carol claim
            await merkleDistributor.claim(dec(3, 18), tree.getProof([carol, dec(3, 18)]), { from: carol })
            assert.equal(await mockToken.balanceOf(carol), dec(3, 18))
        });

    });
});