### quick start
nodejs: v18.20.0

1. 执行yarn
2. cd artmetis/contracts && yarn hardhat compile
3. yarn hardhat compile
4. cd shared/lib-contracts-v0.8 目录参照 secrets.js.template 模版写上自己的部署地址私钥
5. cd artmetis/contracts && yarn hardhat deploy --network goattestnet （需要先删除artmetis/contracts/deployment/goattestnetOutput.json）
