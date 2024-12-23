const ArtMetis =  artifacts.require('ArtMetis')
const AMTRewardPool =  artifacts.require('AMTRewardPool')
const AMTDepositPool =  artifacts.require('AMTDepositPool')
const AMTWithdrawalManager =  artifacts.require('AMTWithdrawalManager')
const AMTConfig =  artifacts.require('AMTConfig')
const StakingPool =  artifacts.require('StakingPool')
const StakingPoolManager = artifacts.require('StakingPoolManager')
const OMetis =  artifacts.require('OMetis')
const Vester =  artifacts.require('Vester')
const MockOracle =  artifacts.require('MockOracle')
const MockL1ERC20Bridge =  artifacts.require('MockL1ERC20Bridge')

// mock
const ERC20Mock = artifacts.require('ERC20Mock')
const MockLockingInfo = artifacts.require('MockLockingInfo')
const MockLockingPoolV2 = artifacts.require('MockLockingPool.sol')

// goat
const MockLocking = artifacts.require('MockLocking.sol')
const SequencerPool = artifacts.require('SequencerPool.sol')
const SequencerPoolManager = artifacts.require('SequencerPoolManager.sol')
const RewardPool = artifacts.require('RewardPool.sol')
const RewardDistributor = artifacts.require('RewardDistributor.sol')
const ERC20MintBurn = artifacts.require('ERC20MintBurn.sol')
const DepositPool = artifacts.require('DepositPool.sol')
const Config = artifacts.require('GoatConfig.sol')
const BaseRewardPool = artifacts.require('BaseRewardPool.sol')
const WithdrawalRecipient = artifacts.require('WithdrawalRecipient.sol')
const WithdrawalManager = artifacts.require('WithdrawalManager.sol')
const GoatAssetManager = artifacts.require('GoatAssetManager.sol')

const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const th = testHelpers.TestHelper
const PLATFORM_TOKEN_ADDRESS = testHelpers.PLATFORM_TOKEN_ADDRESS
const dec = th.dec
const toBN = th.toBN
const AMTConstants = require("./AMTConstants.js").AMTConstants
const Constants = require("./Constants.js").Constants

class DeploymentHelper {

  static async deployBeacon(artifact) {
    const contractFactory = await ethers.getContractFactory(artifact.contractName)
    return await upgrades.deployBeacon(contractFactory)
  }

  static async deployUpgradeableContract(artifact, ...args) {
    const contractFactory = await ethers.getContractFactory(artifact.contractName)
    const contract = await upgrades.deployProxy(contractFactory, args)
    return new artifact(contract.address)
  };

  static async deployMock() {
    const stETH = await ERC20Mock.new('stETH', 'stETH')
    return {
      stETH,
    }
  }

  static async deployGoat() {
    const [owner, rewardRecipient] = (await ethers.getSigners()).slice(0, 2);
    const config = await this.deployUpgradeableContract(Config)
    const goat = await ERC20Mock.new('GOAT', 'GOAT')
    const rewardPool = await this.deployUpgradeableContract(RewardPool, config.address, goat.address)
    const withdrawalRecipient = await this.deployUpgradeableContract(WithdrawalRecipient, config.address)

    await config.setContract(Constants.GOAT_TOKEN, goat.address)
    await config.setContract(Constants.REWARD_POOL, rewardPool.address)
    await config.setContract(Constants.WITHDRAWAL_RECIPIENT, withdrawalRecipient.address)
    await config.setContract(Constants.REWARD_RECIPIENT, rewardRecipient.address)

    const locking = await MockLocking.new(owner.address, goat.address, dec(1, 20))
    const sequencerPoolBeaconProxy = await this.deployBeacon(SequencerPool)
    const distributorBeaconProxy = await this.deployBeacon(RewardDistributor)
    const sequencerPoolManager = await this.deployUpgradeableContract(SequencerPoolManager, config.address, locking.address, sequencerPoolBeaconProxy.address, distributorBeaconProxy.address)
    await config.grantRole(Constants.ADMIN_ROLE, sequencerPoolManager.address)
    await config.setContract(Constants.SEQUENCER_POOL_MANAGER, sequencerPoolManager.address)

    await sequencerPoolManager.createPool(dec(1, 17), dec(2, 17), dec(5, 17))
    const sequencerPool = new SequencerPool(await sequencerPoolManager.getPool(0))
    const distributor = new RewardDistributor(await sequencerPool.distributor())

    const artTokenBeaconProxy = await this.deployBeacon(ERC20MintBurn)
    const depositPoolBeaconProxy = await this.deployBeacon(DepositPool)
    const withdrawalManagerBeaconProxy = await this.deployBeacon(WithdrawalManager)
    const baseRewardPoolBeaconProxy = await this.deployBeacon(BaseRewardPool)

    const goatAssetManager = await this.deployUpgradeableContract(
        GoatAssetManager, config.address, artTokenBeaconProxy.address, depositPoolBeaconProxy.address, withdrawalManagerBeaconProxy.address, baseRewardPoolBeaconProxy.address)
    await config.grantRole(Constants.ADMIN_ROLE, goatAssetManager.address)

    await goatAssetManager.addPoolBeacon(PLATFORM_TOKEN_ADDRESS, 50, [goat.address])
    await goatAssetManager.addPoolBeacon(goat.address, 50, [PLATFORM_TOKEN_ADDRESS])
    let btcContracts = await config.getTokenContracts(PLATFORM_TOKEN_ADDRESS)
    let goatContracts = await config.getTokenContracts(goat.address)

    const artBTC = new ERC20MintBurn(btcContracts.artToken)
    const btcDepositPool = new DepositPool(btcContracts.depositPool)
    const btcWithdrawalManager = new WithdrawalManager(btcContracts.withdrawalManager)
    const artBtcRewardPool = new BaseRewardPool(btcContracts.baseRewardPool)

    const artGoat = new ERC20MintBurn(goatContracts.artToken)
    const goatDepositPool = new DepositPool(goatContracts.depositPool)
    const goatWithdrawalManager = new WithdrawalManager(goatContracts.withdrawalManager)
    const artGoatRewardPool = new BaseRewardPool(goatContracts.baseRewardPool)


    return {
        config,
        goat,
        locking,
        sequencerPool,
        sequencerPoolBeaconProxy,
        distributorBeaconProxy,
        rewardPool,
        sequencerPoolManager,
        btcDepositPool,
        goatDepositPool,
        artBTC,
        artGoat,
        artBtcRewardPool,
        artGoatRewardPool,
        rewardRecipient,
        withdrawalRecipient,
        btcWithdrawalManager,
        goatWithdrawalManager,
        goatAssetManager,
        distributor,
    }
  }

  static async deployL1() {
    const [rewardReceipt, l2DepositPool] = (await ethers.getSigners()).slice(600, 602);
    const [owner] = (await ethers.getSigners()).slice(0, 1);
    const l1Token = await ERC20Mock.new('L1Token', 'L1Token')
    const l1ERC20Bridge = await MockL1ERC20Bridge.new()
    const lockingInfo = await MockLockingInfo.new(l1Token.address, l1ERC20Bridge.address)
    const lockingPool = await MockLockingPoolV2.new(lockingInfo.address)
    await lockingInfo.initManager(lockingPool.address)
    await lockingInfo.setRewardPayer(owner.address)
    const stakingPoolManager = await this.deployUpgradeableContract(StakingPoolManager, l1Token.address)
    const stakingPoolBeaconProxy = await this.deployBeacon(StakingPool)
    await stakingPoolManager.setParams(stakingPoolBeaconProxy.address, lockingPool.address, rewardReceipt.address)
    await stakingPoolManager.createPool()
    const stakingPool = new StakingPool(await stakingPoolManager.getPool(0))

    return {
        rewardReceipt,
        l2DepositPool,
        l1Token,
        lockingPool,
        lockingInfo,
        stakingPoolManager,
        stakingPool,
        stakingPoolBeaconProxy,
        l1ERC20Bridge,
    }
  }

  static async deploy() {
    const [feeReceiver] = (await ethers.getSigners()).slice(500, 501);
    const artMetis = await this.deployUpgradeableContract(ArtMetis)
    const amtConfig = await this.deployUpgradeableContract(AMTConfig)
    const rewardPool = await this.deployUpgradeableContract(AMTRewardPool, amtConfig.address, feeReceiver.address, dec(1, 16))
    const depositPool = await this.deployUpgradeableContract(AMTDepositPool, amtConfig.address)
    const withdrawalManager = await this.deployUpgradeableContract(AMTWithdrawalManager, amtConfig.address)
    // grant mint and burn role to deposit pool
    await artMetis.grantRole(AMTConstants.MINTER_ROLE, depositPool.address)
    await artMetis.grantRole(AMTConstants.BURNER_ROLE, depositPool.address)
    const oMetis = await this.deployUpgradeableContract(OMetis)
    const mockOracle = await MockOracle.new(dec(100, 18))
    const usdt = await ERC20Mock.new('USDT', 'USDT')
    await usdt.setDecimals(6)
    const vester = await this.deployUpgradeableContract(Vester, oMetis.address, usdt.address, mockOracle.address)
    // grant mint and burn role to vester
    await oMetis.grantRole(AMTConstants.MINTER_ROLE, vester.address)
    await oMetis.grantRole(AMTConstants.BURNER_ROLE, vester.address)

    // set config
    await amtConfig.setContract(AMTConstants.ART_METIS, artMetis.address)
    await amtConfig.setContract(AMTConstants.AMT_REWARD_POOL, rewardPool.address)
    await amtConfig.setContract(AMTConstants.AMT_DEPOSIT_POOL, depositPool.address)
    await amtConfig.setContract(AMTConstants.METIS, AMTConstants.METIS_ADDRESS)
    await amtConfig.setContract(AMTConstants.AMT_WITHDRAWAL_MANAGER, withdrawalManager.address)

    return {
      artMetis,
      amtConfig,
      rewardPool,
      depositPool,
      withdrawalManager,
      oMetis,
      vester,
      mockOracle,
      usdt,
    }
  }
}
module.exports = DeploymentHelper
