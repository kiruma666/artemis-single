/* eslint-disable no-console */
import fs from 'fs';

import {providers, Contract} from 'ethers';

import mainnetParams from '../../contracts/deployment/deploymentParams.andromeda.js';
import goatTestnetParams from '../../contracts/deployment/deploymentParams.goattestnet.js';
import sepoliaMetisParams from '../../contracts/deployment/deploymentParams.sepoliametis.js';

const destinationSrcPath = '../../../../oumuamua/artemis/frontend/src';

if (!fs.existsSync(new URL(destinationSrcPath, import.meta.url))) {
    console.log('\nYou must clone [git@github.com:quoll-finance/oumuamua.git] first, and place it in the same folder level as [quoll].\n');
    process.exit(0);
}

// copy abi
const copyAbi = contractPath => {
    const originUrl = new URL(contractPath, import.meta.url);
    const {contractName, abi} = JSON.parse(fs.readFileSync(originUrl));
    const fileUrl = new URL(`${destinationSrcPath}/contracts/abi/${contractName}.json`, import.meta.url);
    fs.writeFileSync(fileUrl, JSON.stringify(abi, null, 2));
    console.log('Abi Copied to: ', fileUrl.pathname, ', from: ', originUrl.pathname);
};

[
    '../../contracts/artifacts/contracts/AMTConfig.sol/AMTConfig.json',
    '../../contracts/artifacts/contracts/AMTDepositPool.sol/AMTDepositPool.json',
    '../../contracts/artifacts/contracts/AMTRewardPool.sol/AMTRewardPool.json',
    '../../contracts/artifacts/contracts/AMTWithdrawalManager.sol/AMTWithdrawalManager.json',

    '../../contracts/artifacts/contracts/OMetis.sol/OMetis.json',
    '../../contracts/artifacts/contracts/Vester.sol/Vester.json',

    // Goat
    '../../contracts/artifacts/contracts/Goat/DepositPool.sol/DepositPool.json',
    '../../contracts/artifacts/contracts/Goat/WithdrawalManager.sol/WithdrawalManager.json',
    '../../contracts/artifacts/contracts/Goat/SequencerPoolManager.sol/SequencerPoolManager.json'
].forEach(copyAbi);

const generateFormalAddressMap = async (chainId, {deploymentJsonPath, params: {externalAddrs, internalAddrs}, defaultAddrs}) => {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentJsonPath));
    const unwrappedDeploymentInfo = Object.fromEntries(Object.entries(deploymentInfo).flatMap(([key, deployInfo]) => {
        return [[key, deployInfo.address]];
    }));

    if (![goatTestnet].includes(+chainId)) {
        return {
            ...defaultAddrs,
            ...externalAddrs,
            ...unwrappedDeploymentInfo
        };
    }

    const goatProviderMap = {
        [goatTestnet]: 'https://rpc.testnet3.goat.network'
    };
    const goatConfigAbi = JSON.parse(fs.readFileSync(new URL('../../contracts/artifacts/contracts/Goat/GoatConfig.sol/GoatConfig.json', import.meta.url)).toString()).abi;
    const goatConfigContract = new Contract(deploymentInfo.goatConfig.address, goatConfigAbi, new providers.JsonRpcProvider(goatProviderMap[chainId]));
    const {goat} = externalAddrs;
    const {eth} = internalAddrs;
    const [goatTokenContracts, btcTokenContracts] = await Promise.all([goat, eth].map(token => goatConfigContract.getTokenContracts(token)));

    return {
        goat,
        goatDepositPool: goatTokenContracts.depositPool,
        goatWithdrawalManager: goatTokenContracts.withdrawalManager,
        goatArtToken: goatTokenContracts.artToken,

        btc: eth,
        btcDepositPool: btcTokenContracts.depositPool,
        btcWithdrawalManager: btcTokenContracts.withdrawalManager,
        btcArtToken: btcTokenContracts.artToken,

        sequencerPoolManager: unwrappedDeploymentInfo.sequencerPoolManager,
    };
};

// prod chains
const metis = 1088;

// test chains
const sepoliaMetis = 59902;
const goatTestnet = 48816;

const configurationMap = {
    [sepoliaMetis]: {
        deploymentJsonPath: new URL('../../contracts/deployment/sepoliametisOutput.json', import.meta.url),
        params: sepoliaMetisParams,
        defaultAddrs: {}
    },
    [metis]: {
        deploymentJsonPath: new URL('../../contracts/deployment/andromedaOutput.json', import.meta.url),
        params: mainnetParams,
        defaultAddrs: {}
    },
    [goatTestnet]: {
        deploymentJsonPath: new URL('../../contracts/deployment/goattestnetOutput.json', import.meta.url),
        params: goatTestnetParams,
        defaultAddrs: {}
    }
};
(async function () {
    const addressMap = Object.fromEntries(await Promise.all(
        Object.entries(configurationMap).map(async ([chainId, configuration]) => [chainId, await generateFormalAddressMap(chainId, configuration)])
    ));

    fs.writeFileSync(new URL(`${destinationSrcPath}/contracts/address-stake-lp.json`, import.meta.url), JSON.stringify(addressMap, null, 2));
})();
