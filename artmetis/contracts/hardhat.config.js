const MainnetDeploymentHelper = require("./utils/mainnetDeploymentHelper.js")

const localhostParams = require("./deployment/deploymentParams.localhost.js")
const goerliParams = require("./deployment/deploymentParams.goerli.js")
const mainnetParams = require("./deployment/deploymentParams.mainnet.js")
const sepoliaParams = require("./deployment/deploymentParams.sepolia.js")
const sepoliametisParams = require("./deployment/deploymentParams.sepoliametis.js")
const andromedaParams = require("./deployment/deploymentParams.andromeda.js")
const goattestnetParams = require("./deployment/deploymentParams.goattestnet.js")

const params = {
    "localhost": localhostParams,
    "goerli": goerliParams,
    "mainnet": mainnetParams,
    "sepolia": sepoliaParams,
    "sepoliametis": sepoliametisParams,
    "andromeda": andromedaParams,
    "goattestnet": goattestnetParams,
};

module.exports = require("@shared/lib-contracts-v0.8/hardhat.config.js");

task("upgrade", "Upgrade specified contract")
    .addParam("name", "name to upgrade")
    .addParam("contract", "contract name")
    .setAction(
        async ({ name, contract }, env) => {
            // ensure non-empty deployer
            const [deployer] = await env.ethers.getSigners();
            if (!deployer) {
                throw new Error("deployer is not set..");
            } else {
                console.log("Deployer is " + deployer.address);
            }

            param = params[env.network.name]
            if (!param) {
                throw new Error(`No config param found for network ${env.network.name}`);
            }

            const mdh = new MainnetDeploymentHelper(param, deployer)
            const deploymentState = mdh.loadPreviousDeployment()

            // upgrade implementation
            await mdh.upgradeContract(name, contract, deploymentState)
        }
    );

task("upgradeBeacon", "Upgrade specified beancon contract")
    .addParam("name", "name to upgrade")
    .addParam("contract", "contract name")
    .setAction(
        async ({ name, contract }, env) => {
            // ensure non-empty deployer
            const [deployer] = await env.ethers.getSigners();
            if (!deployer) {
                throw new Error("deployer is not set..");
            } else {
                console.log("Deployer is " + deployer.address);
            }

            param = params[env.network.name]
            if (!param) {
                throw new Error(`No config param found for network ${env.network.name}`);
            }

            const mdh = new MainnetDeploymentHelper(param, deployer)
            const deploymentState = mdh.loadPreviousDeployment()

            // upgrade implementation
            await mdh.upgradeBeacon(name, contract, deploymentState)
        }
    );

task("deploy", "deploy contracts")
    .setAction(
        async ({ }, env) => {
            // ensure non-empty deployer
            const [deployer] = await env.ethers.getSigners();
            if (!deployer) {
                throw new Error("deployer is not set..");
            } else {
                console.log("Deployer is " + deployer.address);
            }

            param = params[env.network.name]
            if (!param) {
                throw new Error(`No config param found for network ${env.network.name}`);
            }

            const mdh = new MainnetDeploymentHelper(param, deployer)
            const deploymentState = mdh.loadPreviousDeployment()

            await mdh.deploy(deploymentState)
        }
    );
