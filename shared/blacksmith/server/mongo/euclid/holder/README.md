### Deposit Event API
1. crawl & download deposit event
https://niubiwanju.equilibria.fi/script/EuclidAssetDepositorScript/crawlAndCalculate
2. crawl & download AssetWithdrawalQueued event
https://niubiwanju.equilibria.fi/script/EuclidAssetWithdrawalScript/crawlAndCalculate


### Group Ranking API
1. trigger groups calculation 
https://niubiwanju.equilibria.fi/api/euclid-holder-group-ranking/trigger

2. download groups
https://niubiwanju.equilibria.fi/api/euclid-holder-group-ranking/download


### Token Holder API
1. trigger crawl holder ePendle balance
https://niubiwanju.equilibria.fi/api/euclid-holder-e-pendle-balance/trigger
2. download ePendle daily balance
https://niubiwanju.equilibria.fi/api/euclid-holder-e-pendle-balance/download?dateStart=2024-02-28

3. trigger crawl holder vlEqb balance
https://niubiwanju.equilibria.fi/api/euclid-holder-vl-eqb-balance/trigger
4. download vlEqb daily balance
https://niubiwanju.equilibria.fi/api/euclid-holder-vl-eqb-balance/download?dateStart=2024-02-28


### E-Points API
1. trigger E-Points calculation
https://niubiwanju.equilibria.fi/api/euclid-holder-e-points/trigger
2. download daily E-Points
https://niubiwanju.equilibria.fi/api/euclid-holder-e-points/download?dateStart=2024-02-28T15:47:13
3. upload to overrides depositor base E-Points
https://niubiwanju.equilibria.fi/api/euclid-holder-e-points/upload
{file: csv}
4. export address daily detail
https://niubiwanju.equilibria.fi/api/euclid-holder-e-points/export-daily?offset=0&limit=30&address=0x1b1f13a2ff7b8f2f7da6982ed60b293cabad7c9d

### Mongosh

db.euclid_asset_depositor_e_points.find().map(({_id, createdAt}) => ({_id, createdAt}))

db.euclid_asset_depositor_e_points.find().sort({createdAt: -1})

