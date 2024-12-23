### Deposit Event API
1. crawl & download deposit event
https://niubiwanju.equilibria.fi/script/EuclidOperatorDepositScript/crawlAndCalculate

### E-Points API
1. trigger E-Points calculation
https://niubiwanju.equilibria.fi/api/euclid-operator-points/trigger
2. download daily E-Points
https://niubiwanju.equilibria.fi/api/euclid-operator-points/download?dateStart=2024-02-28T15:47:13
3. upload to overrides depositor base E-Points
https://niubiwanju.equilibria.fi/api/euclid-operator-points/upload
{file: csv}
4. export address daily detail
https://niubiwanju.equilibria.fi/api/euclid-operator-points/export-daily?offset=0&limit=30&address=0x

### Mongosh

db.euclid_asset_depositor_e_points.find().map(({_id, createdAt}) => ({_id, createdAt}))

db.euclid_asset_depositor_e_points.find().sort({createdAt: -1})

