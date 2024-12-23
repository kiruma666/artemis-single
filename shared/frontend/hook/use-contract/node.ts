import {ethers} from 'ethers';

export type Provider = ethers.providers.JsonRpcProvider;

export const useContract = (address: string, abi: any, provider: Provider) => {
    return new ethers.Contract(address, abi, provider);
};
