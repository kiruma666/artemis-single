# CoinGecko APIs

## Downloading APIs

- Download top coins csv: https://niubiwanju.equilibria.fi/api/coin-gecko/download-top-coins?limit=300&start=2023-10-01&end=2024-03-31

## Crawling APIs

- crawlAllCoinHistoricalData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/crawlAllCoinHistoricalData?limit=300&fromTimestamp=2024-03-20&toTimestamp=2024-03-31
  - fromTimestamp: timestamp or date str
  - toTimestamp: timestamp or date str
  - forceUpdate: anything or none
- crawlCoinHistoricalData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/crawlCoinHistoricalData?coinId=bitcoin&fromTimestamp=2024-03-20&toTimestamp=2024-03-31
  - coinId: CoinGecko coin ID
  - fromTimestamp: timestamp or date str
  - toTimestamp: timestamp or date str
  - forceUpdate: anything or none
- crawlCoinData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/crawlCoinData?coinId=bitcoin
  - coinId: CoinGecko coin ID
  - forceUpdate: anything or none
 
## Debug Data APIs

- calcAllCoinHistoricalData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/calcAllCoinHistoricalData?limit=300&fromTimestamp=2024-03-20&toTimestamp=2024-03-31
  - fromTimestamp: timestamp or date str
  - toTimestamp: timestamp or date str
- loadCoinHistoricalData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/loadCoinHistoricalData?coinId=bitcoin&fromTimestamp=2024-03-20&toTimestamp=2024-03-31
  - coinId: CoinGecko coin ID
  - fromTimestamp: timestamp or date str
  - toTimestamp: timestamp or date str
- loadCoinData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/loadCoinData?coinId=bitcoin
  - coinId: CoinGecko coin ID

## Debug Original APIs

Directly read data from CoinGecko APIs and return the original responses.

- fetchCoinListWithMarketData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/fetchCoinListWithMarketData?order=market_cap_desc&pageNo=1&pageSize=10
  - order: market_cap_desc | market_cap_asc | volume_asc | volume_desc | id_asc | id_desc
  - pageNo: started from 1
  - pageSize: max 250
- fetchCoinHistoricalChartData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/fetchCoinHistoricalChartData?coinId=bitcoin&fromTimestamp=1696118400000&toTimestamp=1711843200000&interval=daily
  - coinId: CoinGecko coin ID
  - fromTimestamp: millisecond timestamp
  - toTimestamp: millisecond timestamp
  - interval: 5m | hourly | daily
- fetchCoinData: https://niubiwanju.equilibria.fi/api/debug/coin-gecko/fetchCoinData?coinId=bitcoin
  - coinId: CoinGecko coin ID
