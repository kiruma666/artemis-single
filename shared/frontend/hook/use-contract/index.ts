import {useWeb3React} from '@web3-react/core';
import {ethers} from 'ethers';
import {useMemo} from 'react';

export type Provider = ethers.providers.JsonRpcProvider;

export const useContract = (address: string | undefined, abi: any, provider?: Provider) => {
    const {account, library: web3Provider} = useWeb3React();
    const signerOrProvider = provider ?? (account ? web3Provider.getSigner(account) : web3Provider);

    return useMemo(() => {
        if (!address || !signerOrProvider) return null;

        return new ethers.Contract(address, abi, signerOrProvider);
    }, [address, signerOrProvider, abi]);
};
