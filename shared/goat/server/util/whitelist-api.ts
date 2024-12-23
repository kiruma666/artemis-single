import axios, {AxiosResponse} from 'axios';

import {WHITELIST_API_ORIGIN, LOCK_API_ORIGIN} from './constant';

type WhitelistRecord = {
    id: string
    btc_address: string
    group_id: string
    join_time: string
    amount: number
    create_time: string
    update_time: string
}

type WhitelistRecordsResponse = {
    success: boolean
    user: WhitelistRecord[]
}

export const getUserWhitelistRecords = (walletAddress: string) =>
    axios.get<any, AxiosResponse<WhitelistRecordsResponse | null | undefined>>('/api/v1/user', {
        baseURL: WHITELIST_API_ORIGIN,
        params: {btcAddress: walletAddress}
    });

export enum LockRecordRealStatus {
    PENDING = 0,
    CONFIRMING = 1,
    CONFIRMED = 2,
    FAILED = 3
}

type LockRecord = {
    id: string
    tx_id: string
    btc_address: string
    create_time: string
    name: string // Sequencer Name
    amount: string
    status: number
    confirm_block: number
    begin_block_height: number
    lock_block_height: number
    confirm_block_height: number
    end_block_height: number
    real_status: LockRecordRealStatus
}

type LockRecordsResponse = {
    success: boolean
    data: LockRecord[]
}

export const getUserLockRecords = (walletAddress: string) =>
    axios.get<any, AxiosResponse<LockRecordsResponse | null | undefined>>('/api/lock/lockBtcAddressDetail', {
        baseURL: LOCK_API_ORIGIN,
        params: {address: walletAddress}
    });

type UserOfLock = {
    from_btc_address: string
}

type UsersOfLockResponse = {
    success: boolean
    data: UserOfLock[]
}

export const getAllUsersOfLock = () =>
    axios.get<any, AxiosResponse<UsersOfLockResponse | null | undefined>>('/api/lock/allLockBtcAddress', {
        baseURL: LOCK_API_ORIGIN
    });
