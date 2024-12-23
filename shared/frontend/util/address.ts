export const isValidWalletAddress = (address: string): boolean => /^0x[A-Fa-f0-9]{40}$/.test(address);

const WALLET_VISIBLE_DIGITS = 5;
export const getMaskedAddress = (address?: string, visibleDigits = WALLET_VISIBLE_DIGITS) => address && `${address.slice(0, visibleDigits)}...${address.slice(-visibleDigits)}`;
