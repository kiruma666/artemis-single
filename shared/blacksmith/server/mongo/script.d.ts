/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 16:01:54
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-09 16:43:05
 */

type Params = {
    blockStart?: number,
    blockEnd?: number
};

type Calculate = (Params) => Promise<any>;

type Script = {
    meta: {
        name: string,
        address: string,
        customId?: string,
        creationBlock: number,
        abi: any,
        description: string,
        customMaxBlockDiff?: number,
        filterDoc?: (doc: any) => boolean
    },

    crawl: () => Promise<any>,

    crawling?: Promise<any>,

    calculate: Calculate,

    crawlAndCalculate: Calculate,

    fixData?: (params?: Params) => any,

    clearNextCrawlBlock?: () => Promise<void>
};

export default Script;
