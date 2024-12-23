import makeBlockie from 'ethereum-blockies-base64';

export const generateProfileImage = (walletAddress: string) => makeBlockie(walletAddress);
