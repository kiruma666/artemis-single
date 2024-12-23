require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

require('@openzeppelin/hardhat-upgrades');
const path = require('path');
const accounts = require("@shared/lib-contracts/hardhatAccountsList2k.js");
const accountsList = accounts.accountsList

const fs = require('fs')
const getSecret = (secretKey, defaultValue = '') => {
    const PROJECT_SECRETS_FILE = path.resolve("./secrets.js")
    if (fs.existsSync(PROJECT_SECRETS_FILE)) {
        const { secrets } = require(PROJECT_SECRETS_FILE)
        if (secrets[secretKey]) { return secrets[secretKey] }
    }

    const SECRETS_FILE = path.resolve(__filename, "../secrets.js")
    if (fs.existsSync(SECRETS_FILE)) {
        const { secrets } = require(SECRETS_FILE)
        if (secrets[secretKey]) { return secrets[secretKey] }
    }

    return defaultValue
}

const infuraUrlMainnet = () => {
    return `https://mainnet.infura.io/v3/${getSecret('infuraAPIKey')}`
}

const infuraUrlRinkeby = () => {
    return `https://rinkeby.infura.io/v3/${getSecret('infuraAPIKey')}`
}


module.exports = {
    paths: {
        // contracts: "./contracts",
        // artifacts: "./artifacts"
    },
    solidity: {
        compilers: [
            {
                version: "0.8.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    }
                }
            },
        ]
    },
    networks: {
        hardhat: {
            accounts: accountsList,
            gas: 10000000,  // tx gas limit
            blockGasLimit: 12500000,
            gasPrice: 20000000000,
            allowUnlimitedContractSize: true, // only for test
            initialBaseFeePerGas: 0,
        },
        mainnet: {
            url: 'https://rpc.ankr.com/eth',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        rinkeby: {
            url: infuraUrlRinkeby(),
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f')
            ]
        },
        bsc: {
            url: 'https://bsc-dataseed1.ninicoin.io',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        bsctestnet: {
            url: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        bscfork: {
            url: 'https://fork-bsc.equilibria.fi',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        fujitestnet: {
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        evmostestnet: {
            url: "https://eth.bd.evmos.dev:8545",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        evmos: {
            url: "https://evmos-mainnet.public.blastapi.io",
            // url: "https://evmos-rpc2.binary.host/",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        kava: {
            url: "https://evm.kava.io",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        sepolia: {
            url: "https://ethereum-sepolia-rpc.publicnode.com",
            gasPrice: 'auto',
            accounts: [
                getSecret('SEPOLIA_DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        sepoliametis: {
            url: "https://sepolia.metisdevops.link",
            gasPrice: 'auto',
            accounts: [
                getSecret('TESTNET_DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        andromeda: {
            url: "https://andromeda.metis.io/?owner=1088",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        mumbai: {
            url: "https://rpc.ankr.com/polygon_mumbai",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        arbi: {
            url: "https://arbitrum.blockpi.network/v1/rpc/public",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        optimism: {
            url: "https://rpc.ankr.com/optimism",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        goerli: {
            url: "https://eth-goerli.public.blastapi.io",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        holesky: {
            url: "https://holesky.drpc.org",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        mantle: {
            url: "https://rpc.mantle.xyz",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        goattestnet: {
            url: "https://rpc.testnet3.goat.network",
            gasPrice: 200000000,
            accounts: [
                getSecret('DEPLOYER_GOAT_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        base: {
            url: "https://base.llamarpc.com",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
    },
    etherscan: {
        apiKey: {
            mainnet: getSecret("ETHERSCAN_API_KEY"),
            bsc: getSecret("BSCSCAN_API_KEY"),
            arbitrumOne: getSecret("ARBISCAN_API_KEY"),
            optimisticEthereum: getSecret("OPSCAN_API_KEY"),
            andromeda: "apiKey is not required, just set a placeholder",
            sepoliametis:"apiKey is not required, just set a placeholder",
            goattestnet: "empty",
            mantle: getSecret("MANTLESCAN_API_KEY"),
            base: getSecret("BASESCAN_API_KEY"),
        },
        customChains: [
            {
                network: "andromeda",
                chainId: 1088,
                urls: {
                    apiURL:
                        "https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan",
                    browserURL: "https://explorer.metis.io",
                },
            },
            {
                network: "sepoliametis",
                chainId: 59902,
                urls: {
                    apiURL:
                        "https://sepolia-explorer-api.metisdevops.link/api",
                    browserURL: "https://sepolia-explorer.metisdevops.link",
                },
            },
            {
                network: "goattestnet",
                chainId: 48816,
                urls: {
                    apiURL:
                        "https://explorer.testnet3.goat.network/api",
                    browserURL: "https://explorer.testnet3.goat.network",
                },
            },
            {
                network: "mantle",
                chainId: 5000,
                urls: {
                    apiURL:
                        "https://api.mantlescan.xyz/api",
                    browserURL: "https://mantlescan.xyz/",
                },
            },
            {
                network: "base",
                chainId: 8453,
                urls: {
                    apiURL:
                        "https://api.basescan.org/api",
                    browserURL: "https://basescan.org/",
                },
            },
        ],
    },
    mocha: { timeout: 12000000 },
    rpc: {
        host: "localhost",
        port: 8545
    }
};

// set proxy
const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:8118");
setGlobalDispatcher(proxyAgent);