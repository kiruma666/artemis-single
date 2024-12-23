/**
 * @Author: xiaodongyu
 * @Date: 2023-04-16 00:03:54
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-06-26 23:52:18
 */
// doc: https://docs.uniswap.org/sdk/v3/guides/quoting
// ref: https://github.com/Uniswap/examples/blob/main/v3-sdk/quoting/src/libs/quote.ts

import {Token} from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import {computePoolAddress, FeeAmount} from '@uniswap/v3-sdk';
import {BigNumber, Contract, providers} from 'ethers';

const UniswapAddressMap = {
    poolFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
};

const ERC20_ABI = [
    {
        inputs: [],
        name: 'decimals',
        outputs: [
            {
                internalType: 'uint8',
                name: '',
                type: 'uint8'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];

type QuoteParamSimple = {
    provider: providers.JsonRpcProvider
    tokens: {
        lp: string
        in?: number,
    }
};

export async function uniswapQuoteSimple(quoteParam: QuoteParamSimple): Promise<BigNumber> {
    const {provider, tokens} = quoteParam;
    const poolContract = new Contract(
        tokens.lp,
        IUniswapV3PoolABI.abi,
        provider
    );
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee()
    ]);
    const [decimals0, decimals1] = await Promise.all([token0, token1].map(token => new Contract(token, ERC20_ABI, provider).decimals()));

    const quoterContract = new Contract(
        UniswapAddressMap.quoter,
        Quoter.abi,
        provider
    );
    const tokenZero = {address: token0, decimals: decimals0};
    const tokenOne = {address: token1, decimals: decimals1};
    const [tokenIn, tokenOut] = tokens.in === 1 ? [tokenOne, tokenZero] : [tokenZero, tokenOne];
    const quotedAmountOut: BigNumber = await quoterContract.callStatic.quoteExactInputSingle(
        tokenIn.address,
        tokenOut.address,
        fee,
        BigNumber.fromDecimal('1', tokenIn.decimals),
        0
    );

    return quotedAmountOut.changeDecimals(tokenOut.decimals, 18);
}

type QuoteParam = {
    provider: providers.JsonRpcProvider
    tokens: {
        in: Token,
        out: Token,
        poolFee?: FeeAmount,
        amountIn?: string
    }
};

export async function uniswapQuote(quoteParam: QuoteParam): Promise<BigNumber> {
    const {provider, tokens} = quoteParam;
    const quoterContract = new Contract(
        UniswapAddressMap.quoter,
        Quoter.abi,
        provider
    );
    const poolConstants = await getPoolConstants(quoteParam);

    const quotedAmountOut: BigNumber = await quoterContract.callStatic.quoteExactInputSingle(
        poolConstants.token0,
        poolConstants.token1,
        poolConstants.fee,
        BigNumber.fromDecimal(tokens.amountIn ?? '1', tokens.in.decimals),
        0
    );

    return quotedAmountOut.changeDecimals(tokens.out.decimals, 18);
}

async function getPoolConstants({provider, tokens}: QuoteParam): Promise<{
    token0: string
    token1: string
    fee: number
}> {
    const poolAddress = computePoolAddress({
        factoryAddress: UniswapAddressMap.poolFactory,
        tokenA: tokens.in,
        tokenB: tokens.out,
        fee: tokens.poolFee ?? FeeAmount.LOW,
    });
    // console.log({uniswapPoolAddress: poolAddress});

    const poolContract = new Contract(
        poolAddress,
        IUniswapV3PoolABI.abi,
        provider
    );
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee()
    ]);

    return {
        token0,
        token1,
        fee,
    };
}
