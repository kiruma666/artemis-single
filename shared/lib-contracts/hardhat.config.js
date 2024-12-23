require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

require('@openzeppelin/hardhat-upgrades');
const path = require('path');
const accounts = require("./hardhatAccountsList2k.js");
const accountsList = accounts.accountsList

const fs = require('fs')
const getSecret = (secretKey, defaultValue = '') => {
    const SECRETS_FILE = path.resolve(__filename, "../secrets.js")
    let secret = defaultValue
    if (fs.existsSync(SECRETS_FILE)) {
        const { secrets } = require(SECRETS_FILE)
        if (secrets[secretKey]) { secret = secrets[secretKey] }
    }

    return secret
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
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100
                    }
                }
            },
            {
                version: "0.6.12",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
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
            url: infuraUrlMainnet(),
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
            url: 'https://bsc-dataseed1.ninicoin.io/',
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        },
        bsctestnet: {
            url: 'https://bsc-testnet.public.blastapi.io',
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
        arbi: {
            url: "https://arb1.arbitrum.io/rpc",
            gasPrice: 'auto',
            accounts: [
                getSecret('DEPLOYER_PRIVATEKEY', '0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f'),
            ]
        }
    },
    etherscan: {
        apiKey: {
            mainnet: getSecret("ETHERSCAN_API_KEY"),
            bsc: getSecret("BSCSCAN_API_KEY"),
            arbitrumOne: getSecret("ARBISCAN_API_KEY"),
        }

    },
    mocha: { timeout: 12000000 },
    rpc: {
        host: "localhost",
        port: 8545
    }
};