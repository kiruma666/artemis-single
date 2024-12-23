const { keccak256, defaultAbiCoder } = require('ethers/lib/utils'); // Using ethers.js for hashing
const { ecsign } = require('ethereumjs-util');
const crypto = require('crypto');
const { ec } = require('elliptic');
const secp256k1 = new ec('secp256k1');
const testHelpers = require("@shared/lib-contracts/utils/testHelpers.js")
const th = testHelpers.TestHelper
const ERC20Mock = artifacts.require('ERC20Mock')

class DeploymentHelper {
    static generate(chainId, ownerAddress) {
        // Generate a new key pair
        const keyPair = secp256k1.genKeyPair();
        const publicKey = keyPair.getPublic(); // This is a point on the elliptic curve

        // Extract the X and Y coordinates
        const x = publicKey.x.toString('hex'); // X coordinate
        const y = publicKey.y.toString('hex'); // Y coordinate

        // Convert to bytes32 format
        const pubkey = [
            '0x' + x.padStart(64, '0'), // Ensure 32 bytes (64 hex chars)
            '0x' + y.padStart(64, '0')  // Ensure 32 bytes (64 hex chars)
        ];

        console.log("Public Key:", pubkey);

        // 使用函数
        const ethAddress = this.pubkeyToEthAddress(pubkey);
        console.log("ethAddress Address:", ethAddress);

        //
        const consAddr = this.consAddress(pubkey);
        console.log("Consensus Address:", consAddr);

        // 将地址转换为固定长度的字节
        const packedData = ethers.utils.concat([
            ethers.utils.hexZeroPad(ethers.utils.hexlify(chainId), 32), // uint256
            ethers.utils.getAddress(consAddr), // address
            ethers.utils.getAddress(ownerAddress) // address
        ]);

        // 计算 keccak256 哈希
        const dataToSign = ethers.utils.keccak256(packedData);
        console.log("Data to Sign:", dataToSign.toString('hex'));

        // Sign the data
        const { r, s, v } = ecsign(Buffer.from(dataToSign.slice(2), 'hex'), Buffer.from(keyPair.getPrivate('hex'), 'hex'));

        // Output the signature
        console.log("Signature R:", r.toString('hex'));
        console.log("Signature S:", s.toString('hex'));
        console.log("Signature V:", v);

        return {
            pubkey: pubkey,
            ethAddress: ethAddress,
            consAddr: consAddr,
            R: r,
            S: s,
            V: v
        }
    }

    // 用公钥计算 Ethereum 地址
    static pubkeyToEthAddress(pubkey) {
        // 计算 keccak256 哈希
        const hash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[2]'], [pubkey]));

        // 转换为 uint256
        const uint256 = ethers.BigNumber.from(hash);

        // 转换为 uint160 并转换为地址
        const address = ethers.utils.getAddress(uint256.toHexString().slice(26)); // 取后 20 个字符

        return address;
    }

    // 将公钥转换为ConsAddress的函数
    static consAddress(pubkey) {
        // 确保 pubkey 是一个包含两个十六进制字符串的数组
        const xCoord = pubkey[0]; // X 坐标
        const yCoord = pubkey[1]; // Y 坐标

        // 选择前缀，根据 y 坐标的奇偶性
        const prefix = (BigInt(`${yCoord}`) & 1n) === 0n ? Buffer.from([0x02]) : Buffer.from([0x03]);

        // 将前缀和 x 坐标连接起来，确保 x 坐标是 Buffer 类型
        const xCoordBuffer = Buffer.from(xCoord.slice(2), 'hex'); // 去掉 '0x' 前缀
        const concatBuffer = Buffer.concat([prefix, xCoordBuffer]);

        // 计算 SHA-256 哈希
        const sha256Hash = crypto.createHash('sha256').update(concatBuffer).digest();

        // 计算 RIPEMD-160 哈希
        const ripemd160Hash = crypto.createHash('ripemd160').update(sha256Hash).digest();

        // 生成地址，前缀为 '0x'，后面跟随 RIPEMD-160 哈希的十六进制字符串
        const address = '0x' + ripemd160Hash.toString('hex');

        return address;
    }

    static async deposit(depositPool, sequencerPool, amount, args) {
        let token = await depositPool.token()
        const [owner] = (await ethers.getSigners()).slice(0, 1)
        if (args === undefined) {
            args = {}
        }
        if (args.from === undefined) {
            args.from = owner.address
        }
        if (token == testHelpers.PLATFORM_TOKEN_ADDRESS) {
            if (args.value === undefined) {
                args.value = amount
            }
        } else {
            token = await ERC20Mock.at(token)
            await token.mint(args.from, amount)
            await token.approve(depositPool.address, amount, { from: args.from })
        }
        await depositPool.deposit(sequencerPool, amount, 0, "", args)
    }

    static async create(locking, sequencerPool, args) {
        let result = this.generate(31337, sequencerPool.address)
        await locking.approve(result.consAddr)
        await sequencerPool.create(result.pubkey, result.R, result.S, result.V, args)
    }

    static async getAssetBalance(asset, user) {
        if (asset == th.ZERO_ADDRESS) {
            return await web3.eth.getBalance(user)
        } else {
            const erc20 = await IERC20.at(asset)
            return await erc20.balanceOf(user)
        }
    }
}
module.exports = DeploymentHelper
