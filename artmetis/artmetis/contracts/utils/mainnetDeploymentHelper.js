const fs = require('fs')

const ZERO_ADDRESS = '0x' + '0'.repeat(40)

class MainnetDeploymentHelper {
  constructor(configParams, deployerWallet) {
    this.configParams = configParams
    this.deployerWallet = deployerWallet
    this.hre = require('hardhat')
    if (this.hre.network.name == 'mumbai') {
      // workaround for "contract creation code storage out of gas" on mumbai
      this.deployerWallet.provider.estimateGas = async () => 10000000;
    }
    this.Constants = {
      // roles
      ADMIN_ROLE: ethers.utils.id('ADMIN_ROLE'),
      MINTER_ROLE: ethers.utils.id('MINTER_ROLE'),
      BURNER_ROLE: ethers.utils.id('BURNER_ROLE'),
      // contracts
      ART_METIS: ethers.utils.id('ART_METIS'),
      AMT_REWARD_POOL: ethers.utils.id('AMT_REWARD_POOL'),
      AMT_DEPOSIT_POOL: ethers.utils.id('AMT_DEPOSIT_POOL'),
      METIS: ethers.utils.id('METIS'),
      L1_STAKING_POOL: ethers.utils.id('L1_STAKING_POOL'),
      AMT_WITHDRAWAL_MANAGER: ethers.utils.id('AMT_WITHDRAWAL_MANAGER'),

      // goat
      GOAT_TOKEN: ethers.utils.id('GOAT_TOKEN'),
      REWARD_POOL: ethers.utils.id('REWARD_POOL'),
      WITHDRAWAL_RECIPIENT: ethers.utils.id('WITHDRAWAL_RECIPIENT'),
      REWARD_RECIPIENT: ethers.utils.id('REWARD_RECIPIENT'),
      SEQUENCER_POOL_MANAGER: ethers.utils.id('SEQUENCER_POOL_MANAGER'),
    }
  }

  loadPreviousDeployment() {
    let previousDeployment = {}
    if (fs.existsSync(this.configParams.OUTPUT_FILE)) {
      console.log(`Loading previous deployment...`)
      previousDeployment = require('../' + this.configParams.OUTPUT_FILE)
    }

    return previousDeployment
  }

  saveDeployment(deploymentState) {
    const deploymentStateJSON = JSON.stringify(deploymentState, null, 2)
    fs.writeFileSync(this.configParams.OUTPUT_FILE, deploymentStateJSON)
  }

  async getFactory(name) {
    const factory = await ethers.getContractFactory(name, this.deployerWallet)
    return factory
  }

  async sendAndWaitForTransaction(txPromise) {
    const tx = await txPromise
    const minedTx = await ethers.provider.waitForTransaction(tx.hash, this.configParams.TX_CONFIRMATIONS)

    return minedTx
  }

  async loadOrSaveProxyAdmin(deploymentState) {
    if (!this.proxyadmin) {
      const proxyadmin = await this.hre.upgrades.admin.getInstance()
      const name = 'proxyadmin'
      if (deploymentState[name] && deploymentState[name].address) {
        assert.equal(proxyadmin.address, deploymentState[name].address)
      } else {
        deploymentState[name] = {
          address: proxyadmin.address,
        }
        this.saveDeployment(deploymentState)
      }
      this.proxyadmin = proxyadmin
    }
    return this.proxyadmin
  }

  async loadOrDeploy(name, contractName, deploymentState, params = [], verify = true) {
    console.log(`Deploying ${name}...`)
    const factory = await this.getFactory(contractName)
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(`Using previously deployed ${name} contract at address ${deploymentState[name].address}`)
      if (verify) {
        await this.verifyContract(name, deploymentState, params)
      }
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    }

    const contract = await factory.deploy(...params)
    await this.deployerWallet.provider.waitForTransaction(contract.deployTransaction.hash, this.configParams.TX_CONFIRMATIONS)

    deploymentState[name] = {
      address: contract.address,
      txHash: contract.deployTransaction.hash
    }
    console.log(deploymentState[name])

    this.saveDeployment(deploymentState)

    if (verify) {
      await this.verifyContract(name, deploymentState, params)
    }

    return contract
  }

  async loadOrDeployUpgradeable(name, contractName, deploymentState, params = [], verify = true) {
    console.log(`Deploying ${name}...`)
    const factory = await this.getFactory(contractName)
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(`Using previously deployed ${name} contract at address ${deploymentState[name].address}`)
      if (verify) {
        await this.verifyContract(name, deploymentState)
      }
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    }

    const contract = await upgrades.deployProxy(factory, params, { gasLimit: 5000000 })
    await this.deployerWallet.provider.waitForTransaction(contract.deployTransaction.hash, this.configParams.TX_CONFIRMATIONS)

    await this.loadOrSaveProxyAdmin(deploymentState)
    const implAddress = await this.proxyadmin.getProxyImplementation(contract.address)

    deploymentState[name] = {
      address: contract.address,
      implAddress: implAddress,
      txHash: contract.deployTransaction.hash
    }
    console.log(deploymentState[name])

    this.saveDeployment(deploymentState)

    if (verify) {
      await this.verifyContract(name, deploymentState)
    }

    return contract
  }

  async loadOrDeployBeacon(name, contractName, deploymentState, verify = true) {
    console.log(`Deploying Beacon ${name}...`)
    const beaconFactory = await this.getFactory('UpgradeableBeacon')
    const factory = await this.getFactory(contractName)
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(`Using previously deployed ${name} contract at address ${deploymentState[name].address}`)
      return new ethers.Contract(
        deploymentState[name].address,
        beaconFactory.interface,
        this.deployerWallet
      );
    }

    const contract = await upgrades.deployBeacon(factory, { gasLimit: 5000000 })
    await this.deployerWallet.provider.waitForTransaction(contract.deployTransaction.hash, this.configParams.TX_CONFIRMATIONS)

    const implAddress = await contract.implementation()

    deploymentState[name] = {
      address: contract.address,
      implAddress: implAddress,
      txHash: contract.deployTransaction.hash
    }
    console.log(deploymentState[name])

    this.saveDeployment(deploymentState)

    if (verify) {
      await this.verifyContract(name, deploymentState)
    }

    return contract
  }

  async upgradeBeacon(name, contractName, deploymentState) {
    if (!deploymentState[name] || !deploymentState[name].implAddress) {
      throw new Error(`  --> No deployment state for contract ${name}!!`)
    }

    const beaconFactory = await this.getFactory('UpgradeableBeacon')
    const beacon = new ethers.Contract(
      deploymentState[name].address,
      beaconFactory.interface,
      this.deployerWallet,
    )

    let oldImplAddress = deploymentState[name].implAddress
    assert.equal(oldImplAddress, await beacon.implementation())


    console.log(`upgrading beacon ${name}: ${deploymentState[name].address}, current implementation address: ${oldImplAddress}`)

    let contractFactory = await this.getFactory(contractName)
    const upgradedBeacon = await upgrades.upgradeBeacon(beacon.address, contractFactory);
    await upgradedBeacon.deployed()

    let newImplAddress = await upgradedBeacon.implementation()

    assert.notEqual(oldImplAddress, newImplAddress)

    deploymentState[name].implAddress = newImplAddress

    this.saveDeployment(deploymentState)

    console.log(`upgraded beacon ${name}: ${deploymentState[name].address}, current implementation address: ${newImplAddress}`)

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
    } else {
      deploymentState[name].implVerification = ""
      this.saveDeployment(deploymentState)
      await this.verifyContract(name, deploymentState)
    }
  }

  async upgradeContract(name, contractName, deploymentState) {
    if (!deploymentState[name] || !deploymentState[name].implAddress) {
      throw new Error(`  --> No deployment state for contract ${name}!!`)
    }
    await this.loadOrSaveProxyAdmin(deploymentState)

    let oldImplAddress = deploymentState[name].implAddress
    assert.equal(oldImplAddress, await this.proxyadmin.getProxyImplementation(deploymentState[name].address))

    let contractFactory = await this.getFactory(contractName)
    let newImplAddress

    if ((await this.proxyadmin.owner()).toUpperCase() == this.deployerWallet.address.toUpperCase()) {
      console.log(`upgrading contract ${name}: ${deploymentState[name].address}, current implementation address: ${oldImplAddress}`)

      const contract = await upgrades.upgradeProxy(deploymentState[name].address, contractFactory);
      await contract.deployed()

      newImplAddress = await this.proxyadmin.getProxyImplementation(deploymentState[name].address)
    } else {
      console.log(`prepare to upgrade contract ${name}: ${deploymentState[name].address}, current implementation address: ${oldImplAddress}`)
      newImplAddress = await upgrades.prepareUpgrade(deploymentState[name].address, contractFactory);
    }

    assert.notEqual(oldImplAddress, newImplAddress)

    deploymentState[name].implAddress = newImplAddress

    this.saveDeployment(deploymentState)

    console.log(`upgraded contract ${name}: ${deploymentState[name].address}, current implementation address: ${newImplAddress}`)

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
    } else {
      deploymentState[name].implVerification = ""
      this.saveDeployment(deploymentState)
      await this.verifyContract(name, deploymentState)
    }
  }

  // --- Verify on Ethrescan ---
  async verify(address, constructorArguments = []) {
    try {
      await this.hre.run("verify:verify", {
        address: address,
        constructorArguments,
      })
    } catch (error) {
      console.error(error)
      // if it was already verified, it’s like a success, so let’s move forward and save it
      if (error.name != 'NomicLabsHardhatPluginError') {
        console.error(`Error verifying: ${error.name}`)
        return
      }
    }
  }

  async verifyContract(name, deploymentState, constructorArguments = []) {
    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
      return
    }
    if (!deploymentState[name] || !deploymentState[name].address) {
      console.error(`  --> No deployment state for contract ${name}!!`)
      return
    }
    if (deploymentState[name].verification) {
      console.log(`Contract ${name} already verified`)
    } else {
      await this.verify(deploymentState[name].address, constructorArguments)
      deploymentState[name].verification = `${this.configParams.ETHERSCAN_BASE_URL}/${deploymentState[name].address}#code`
      this.saveDeployment(deploymentState)
    }

    if (deploymentState[name].implAddress) {
      if (deploymentState[name].implVerification) {
        console.log(`Contract ${name} implementation already verified`)
      } else {
        await this.verify(deploymentState[name].implAddress)
        deploymentState[name].implVerification = `${this.configParams.ETHERSCAN_BASE_URL}/${deploymentState[name].implAddress}#code`
        this.saveDeployment(deploymentState)
      }
    }
  }

  async getContract(name, contractName, deploymentState) {
    console.log(`getContract ${name}...`)
    const factory = await this.getFactory(contractName)
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(`Using previously deployed ${name} contract at address ${deploymentState[name].address}`)
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    } else {
      console.log(`contract not exists`)
    }
  }

  isL1Chain() {
    let network = this.hre.network.name
    return network == 'sepolia' || network == 'mainnet'
  }

  isL2Chain() {
    let network = this.hre.network.name
    return network == 'sepoliametis' || network == 'andromeda'
  }

  isGoat() {
    let network = this.hre.network.name
    return network == 'goat' || network == 'goattestnet'
  }

  async deploy(deploymentState) {
    if (this.isL1Chain()) {
      await this.depoloyL1(deploymentState)
    } else if (this.isL2Chain()) {
      await this.deployL2(deploymentState)
    } else if (this.isGoat()) {
      await this.deployGoat(deploymentState)
    } else {
      throw new Error(`Unsupported network ${this.hre.network.name}`)
    }

  }

  async deployGoat(deploymentState) {
    const configs = this.configParams.configs
    const internalAddrs = this.configParams.internalAddrs
    const externalAddrs = this.configParams.externalAddrs

    let goatConfig = await this.loadOrDeployUpgradeable('goatConfig', 'GoatConfig', deploymentState)
    let rewardPool = await this.loadOrDeployUpgradeable('rewardPool', 'RewardPool', deploymentState, [goatConfig.address, externalAddrs.goat])
    let withdrawalRecipient = await this.loadOrDeployUpgradeable('withdrawalRecipient', 'WithdrawalRecipient', deploymentState, [goatConfig.address])

    // set config
    if (await goatConfig.getContract(this.Constants.GOAT_TOKEN) != externalAddrs.goat) {
        console.log(`setting goat token in goatConfig`)
        await this.sendAndWaitForTransaction(goatConfig.setContract(
            this.Constants.GOAT_TOKEN,
            externalAddrs.goat,
        ))
    }
    if (await goatConfig.getContract(this.Constants.REWARD_POOL) != rewardPool.address) {
        console.log(`setting rewardPool contract in goatConfig`)
        await this.sendAndWaitForTransaction(goatConfig.setContract(
            this.Constants.REWARD_POOL,
            rewardPool.address,
        ))
    }
    if (await goatConfig.getContract(this.Constants.WITHDRAWAL_RECIPIENT) != withdrawalRecipient.address) {
        console.log(`setting withdrawalRecipient contract in goatConfig`)
        await this.sendAndWaitForTransaction(goatConfig.setContract(
            this.Constants.WITHDRAWAL_RECIPIENT,
            withdrawalRecipient.address,
        ))
    }
    if (await goatConfig.getContract(this.Constants.REWARD_RECIPIENT) != internalAddrs.rewardRecipient) {
        console.log(`setting rewardRecipient address in goatConfig`)
        await this.sendAndWaitForTransaction(goatConfig.setContract(
            this.Constants.REWARD_RECIPIENT,
            internalAddrs.rewardRecipient,
        ))
    }

    // deploy the asset asocciated contracts
    let artTokenBeaconProxy = await this.loadOrDeployBeacon('artTokenBeaconProxy', 'ERC20MintBurn', deploymentState)
    let depositPoolBeaconProxy = await this.loadOrDeployBeacon('depositPoolBeaconProxy', 'DepositPool', deploymentState)
    let withdrawalManagerBeaconProxy = await this.loadOrDeployBeacon('withdrawalManagerBeaconProxy', 'WithdrawalManager', deploymentState)
    let baseRewardPoolBeaconProxy = await this.loadOrDeployBeacon('baseRewardPoolBeaconProxy', 'BaseRewardPool', deploymentState)
    let goatAssetManager = await this.loadOrDeployUpgradeable('goatAssetManager', 'GoatAssetManager', deploymentState,
        [goatConfig.address, artTokenBeaconProxy.address, depositPoolBeaconProxy.address, withdrawalManagerBeaconProxy.address, baseRewardPoolBeaconProxy.address])
    if (!(await goatConfig.hasRole(this.Constants.ADMIN_ROLE, goatAssetManager.address))) {
        console.log(`adding admin role to goatAssetManager`)
        await goatConfig.grantRole(
            this.Constants.ADMIN_ROLE,
            goatAssetManager.address,
        )
    }

    let assetsConfig = configs.assets
    for (let i = 0; i < assetsConfig.length; i++) {
      let asset = assetsConfig[i]
      if ((await goatConfig.getTokenContracts(asset.address)).artToken == ZERO_ADDRESS) {
        console.log(`adding asset ${asset.name} to goatAssetManager`)
        await goatAssetManager.addPoolBeacon(asset.address, asset.rewardWeight, asset.rewardToken)
      } else {
        console.log(`asset ${asset.name} already exists in goatAssetManager`)
      }
    }

    // deploy the sequencer pool
    let sequencerPoolBeaconProxy = await this.loadOrDeployBeacon('sequencerPoolBeaconProxy', 'SequencerPool', deploymentState)
    let rewardDistributorBeaconProxy = await this.loadOrDeployBeacon('rewardDistributorBeaconProxy', 'RewardDistributor', deploymentState)
    let sequencerPoolManager = await this.loadOrDeployUpgradeable('sequencerPoolManager', 'SequencerPoolManager', deploymentState,
        [goatConfig.address, externalAddrs.locking, sequencerPoolBeaconProxy.address, rewardDistributorBeaconProxy.address])
    if (!(await goatConfig.hasRole(this.Constants.ADMIN_ROLE, sequencerPoolManager.address))) {
        console.log(`adding admin role to sequencerPoolManager`)
        await goatConfig.grantRole(
            this.Constants.ADMIN_ROLE,
            sequencerPoolManager.address,
        )
    }

    if (await goatConfig.getContract(this.Constants.SEQUENCER_POOL_MANAGER) != sequencerPoolManager.address) {
      console.log(`setting sequencerPoolManager address in goatConfig`)
      await this.sendAndWaitForTransaction(goatConfig.setContract(
          this.Constants.SEQUENCER_POOL_MANAGER,
          sequencerPoolManager.address,
      ))
    }

    let poolsize = await sequencerPoolManager.getPoolCount()
    for (let i = 0; i < configs.sequencerPool.length; i++) {
      let pool = configs.sequencerPool[i]
      if (poolsize > i) {
        console.log(`already exists sequencer pool ${pool.name} in sequencerPoolManager`)
      } else {
        console.log(`create sequencer pool ${pool.name} in sequencerPoolManager`)
        await sequencerPoolManager.createPool(pool.feeRate, pool.feeShare, pool.extraShare)
      }
    }

  }

  async deployL2(deploymentState) {
    const configs = this.configParams.configs
    const internalAddrs = this.configParams.internalAddrs
    const externalAddrs = this.configParams.externalAddrs

    let amtConfig = await this.loadOrDeployUpgradeable('amtConfig', 'AMTConfig', deploymentState)
    let artMetis = await this.loadOrDeployUpgradeable('artMetis', 'ArtMetis', deploymentState)
    let amtRewardPool = await this.loadOrDeployUpgradeable('amtRewardPool', 'AMTRewardPool', deploymentState, [amtConfig.address, configs.rewardPoolConfig.feeReceiver, configs.rewardPoolConfig.feeRate])
    let amtDepositPool = await this.loadOrDeployUpgradeable('amtDepositPool', 'AMTDepositPool', deploymentState, [amtConfig.address])
    let oracleAddress
    if (externalAddrs.priceFeed == undefined && externalAddrs.oracle != undefined) {
      oracleAddress = externalAddrs.oracle;
    } else {
      let chainlinkOracle = await this.loadOrDeployUpgradeable('chainlinkOracle', 'ChainlinkOracle', deploymentState, [externalAddrs.priceFeed])
      oracleAddress = chainlinkOracle.address;
    }
    let oMetis = await this.loadOrDeployUpgradeable('oMetis', 'OMetis', deploymentState)
    let vester = await this.loadOrDeployUpgradeable('vester', 'Vester', deploymentState, [oMetis.address, externalAddrs.usdt, oracleAddress])
    const merkleDistributorV2Beacon = await this.loadOrDeployBeacon('merkleDistributorV2Beacon', 'MerkleDistributorV2', deploymentState)
    const merkleDistributorFactory = await this.loadOrDeployUpgradeable('merkleDistributorFactory', 'MerkleDistributorFactory', deploymentState, [merkleDistributorV2Beacon.address])
    const amtWithdrawalManager = await this.loadOrDeployUpgradeable('amtWithdrawalManager', 'AMTWithdrawalManager', deploymentState, [amtConfig.address])
    const timelockController = await this.loadOrDeploy('timelockController', 'TimelockController', deploymentState, [86400, [], []])
    const sequencerNodeManager = await this.loadOrDeployUpgradeable('sequencerNodeManager', 'SequencerNodeManager', deploymentState)

    // grant mint and burn role to deposit pool
    if (!(await artMetis.hasRole(this.Constants.MINTER_ROLE, amtDepositPool.address))) {
      console.log(`adding minter role to deposit pool`)
      await this.sendAndWaitForTransaction(artMetis.grantRole(
        this.Constants.MINTER_ROLE,
        amtDepositPool.address,
      ))
    }

    if (!(await artMetis.hasRole(this.Constants.BURNER_ROLE, amtDepositPool.address))) {
      console.log(`adding burn role to deposit pool`)
      await this.sendAndWaitForTransaction(artMetis.grantRole(
        this.Constants.BURNER_ROLE,
        amtDepositPool.address,
      ))
    }

    // set config
    if (await amtConfig.getContract(this.Constants.ART_METIS) != artMetis.address) {
      console.log(`setting artMetis contract in amtConfig`)
      await this.sendAndWaitForTransaction(amtConfig.setContract(
        this.Constants.ART_METIS,
        artMetis.address,
      ))
    }
    if (await amtConfig.getContract(this.Constants.AMT_REWARD_POOL) != amtRewardPool.address) {
      console.log(`setting rewardPool contract in amtConfig`)
      await this.sendAndWaitForTransaction(amtConfig.setContract(
        this.Constants.AMT_REWARD_POOL,
        amtRewardPool.address,
      ))
    }
    if (await amtConfig.getContract(this.Constants.AMT_DEPOSIT_POOL) != amtDepositPool.address) {
      console.log(`setting depositPool contract in amtConfig`)
      await this.sendAndWaitForTransaction(amtConfig.setContract(
        this.Constants.AMT_DEPOSIT_POOL,
        amtDepositPool.address,
      ))
    }
    if (await amtConfig.getContract(this.Constants.AMT_WITHDRAWAL_MANAGER) != amtWithdrawalManager.address) {
      console.log(`setting withdrawalManager contract in amtConfig`)
      await this.sendAndWaitForTransaction(amtConfig.setContract(
        this.Constants.AMT_WITHDRAWAL_MANAGER,
        amtWithdrawalManager.address,
      ))
    }
    if (await amtConfig.getContract(this.Constants.METIS) != externalAddrs.metis) {
      console.log(`setting metis address in amtConfig`)
      await this.sendAndWaitForTransaction(amtConfig.setContract(
        this.Constants.METIS,
        externalAddrs.metis,
      ))
    }
    if (externalAddrs.l1_staking_pool_manager != undefined) {
      if (await amtConfig.getContract(this.Constants.L1_STAKING_POOL) != externalAddrs.l1_staking_pool_manager) {
        console.log(`setting l1StakingPool address in amtConfig`)
        await this.sendAndWaitForTransaction(amtConfig.setContract(
          this.Constants.L1_STAKING_POOL,
          externalAddrs.l1_staking_pool_manager,
        ))
      }
    }

    // grant minter role to vester
    if (!(await oMetis.hasRole(this.Constants.MINTER_ROLE, vester.address))) {
      console.log(`adding minter role to vester`)
      await this.sendAndWaitForTransaction(oMetis.grantRole(
        this.Constants.MINTER_ROLE,
        vester.address,
      ))
    }

    // grant burner role to vester
    if (!(await oMetis.hasRole(this.Constants.BURNER_ROLE, vester.address))) {
      console.log(`adding burn role to vester`)
      await this.sendAndWaitForTransaction(oMetis.grantRole(
        this.Constants.BURNER_ROLE,
        vester.address,
      ))
    }

  }

  async depoloyL1(deploymentState) {
    const configs = this.configParams.configs
    const internalAddrs = this.configParams.internalAddrs
    const externalAddrs = this.configParams.externalAddrs

    let stakingPoolBeacon = await this.loadOrDeployBeacon('stakingPoolBeacon', 'StakingPool', deploymentState)
    let stakingPoolManager = await this.loadOrDeployUpgradeable('stakingPoolManager', 'StakingPoolManager', deploymentState, [externalAddrs.l1Token])
    if (await stakingPoolManager.stakingPoolBeaconProxy() != stakingPoolBeacon.address) {
      console.log(`setting params`)
      await this.sendAndWaitForTransaction(
        stakingPoolManager.setParams(
          stakingPoolBeacon.address,
          externalAddrs.lockingPool,
          externalAddrs.rewardRecipient
        )
      )
    }
  }

}

module.exports = MainnetDeploymentHelper