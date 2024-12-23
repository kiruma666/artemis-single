### Event API
1. crawl & download deposit event
https://niubiwanju.equilibria.fi/script/ArtemisAssetDepositorScript/crawlAndCalculate

2. crawl & download swap event
https://niubiwanju.equilibria.fi/script/ArtemisLiquiditySwapScript/crawlAndCalculate
https://niubiwanju.equilibria.fi/script/ArtemisLiquiditySwapScript/fixData

3. crawl & download artMetis transfer event
https://niubiwanju.equilibria.fi/script/ArtemisArtMetisTransferScript/crawlAndCalculate

3. crawl & download artMetis WithdrawRequestInitiated event
https://niubiwanju.equilibria.fi/script/ArtemisWithdrawInitiatedScript/crawlAndCalculate


### Group Ranking API
1. trigger groups calculation 
https://niubiwanju.equilibria.fi/api/artemis-holder-group-ranking/trigger

2. download groups
https://niubiwanju.equilibria.fi/api/artemis-holder-group-ranking/download


### Token Holder API
1. trigger crawl holder ePendle balance
https://niubiwanju.equilibria.fi/api/artemis-holder-e-pendle-balance/trigger
2. download ePendle daily balance
https://niubiwanju.equilibria.fi/api/artemis-holder-e-pendle-balance/download?dateStart=2024-03-01

3. trigger crawl holder vlEqb balance
https://niubiwanju.equilibria.fi/api/artemis-holder-vl-eqb-balance/trigger
4. download vlEqb daily balance
https://niubiwanju.equilibria.fi/api/artemis-holder-vl-eqb-balance/download?dateStart=2024-03-01

5. trigger crawl holder nft position
https://niubiwanju.equilibria.fi/api/artemis-holder-nft-position/trigger
6. download nft daily position
https://niubiwanju.equilibria.fi/api/artemis-holder-nft-position/download?dateStart=2024-03-24

7. trigger crawl holder lp position
https://niubiwanju.equilibria.fi/api/artemis-holder-lp-position/trigger
8. download lp daily position
https://niubiwanju.equilibria.fi/api/artemis-holder-lp-position/download?dateStart=2024-03-27

9. trigger crawl holder camelot nft position
https://niubiwanju.equilibria.fi/api/artemis-holder-camelot-nft-position/trigger
10. download nft daily position
https://niubiwanju.equilibria.fi/api/artemis-holder-camelot-nft-position/download?dateStart=2024-03-30

11. trigger crawl holder sheobill artMetis
https://niubiwanju.equilibria.fi/api/artemis-holder-sheobill-art-metis-balance/trigger
12. download sheobill artMetis daily position
https://niubiwanju.equilibria.fi/api/artemis-holder-sheobill-art-metis-balance/download?dateStart=2024-04-28

13. trigger crawl holder sheobill Metis
https://niubiwanju.equilibria.fi/api/artemis-holder-sheobill-metis-balance/trigger
14. download sheobill Metis daily position
https://niubiwanju.equilibria.fi/api/artemis-holder-sheobill-metis-balance/download?dateStart=2024-04-28

### Art-Points API
1. trigger Art-Points calculation
https://niubiwanju.equilibria.fi/api/artemis-holder-art-points/trigger
2. download daily Art-Points
https://niubiwanju.equilibria.fi/api/artemis-holder-art-points/download?dateStart=2024-03-01
3. upload to overrides depositor base Art-Points
https://niubiwanju.equilibria.fi/api/artemis-holder-art-points/upload
{file: csv}
4. export address daily detail
https://niubiwanju.equilibria.fi/api/artemis-holder-art-points/export-daily?offset=0&limit=30&address=0x19bdf78e55c25ec20dccbbd434fba4a34e964c0f
5. download hercules diff
https://niubiwanju.equilibria.fi/api/artemis-holder-art-points/hercules-diff?dateStart=2024-05-19&dateEnd=2024-05-26


### Base Hercules Points
const dailyBaseHerculesPoints = (nftUserMap[holder] ? +nftUserMap[holder].toDecimal() : 1) + (lpUserMap[holder] ? +lpUserMap[holder].toDecimal() : 0) + (camelotNftUserMap[holder] ? +camelotNftUserMap[holder].toDecimal() : 0);

nft: balanceOf tokenOfOwnerByIndex positions
https://explorer.metis.io/address/0x3C93AEf118F8c2183B32dCa29Aa6220F2b2A1593/contract/1088/readContract#F4

lp: balanceOf
https://explorer.metis.io/token/0x252d0af80D46652a74b062Be56C1Cc38324D3eA4/contract/readContract#F9

camelotNft: balanceOf tokenOfOwnerByIndex getStakingPosition
https://explorer.metis.io/token/0x75A05DEa768F5a8E90227d900EC82038e4584e9a/contract/readContract#F4


### Mongosh

db.artemis_asset_depositor_e_points.find().map(({_id, createdAt}) => ({_id, createdAt}))

db.artemis_asset_depositor_e_points.find().sort({createdAt: -1})
db.artemis_asset_depositor_art_points.find().sort({createdAt: -1}).limit(1).map(rec => ({recId: rec._id, createdAt: rec.createdAt, ...rec.points.find(userPoint => userPoint.user === '0xebAe9733e68752acc9a74D290aa9E8E64fE6Bbb4'.toLowerCase())}))
db.artemis_asset_depositor_art_points.findAndModify({query:{_id: ObjectId("663ac78d8823aae334e29ea3")}, arrayFilters: [ { "elem.user": {$eq:'0xebae9733e68752acc9a74d290aa9e8e64fe6bbb4' }} ], update: { $set: { "points.$[elem].artPoints" : 1778.8144198112782 } }})

