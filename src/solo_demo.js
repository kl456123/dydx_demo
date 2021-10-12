import { Solo, Networks, MarketId, BigNumber, AccountNumbers } from "@dydxprotocol/solo";
// import { Perpetual, PerpetualMarket, Networks } from '@dydxprotocol/perpetual';
import Web3 from "web3";
import dotenv from "dotenv";

dotenv.config();

// const provider = ;
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const url = "https://eth-kovan.alchemyapi.io/v2/v9sBLm6_PGC-amtokSZQIGDSkNZMgfzv";
const options = {
  defaultAccount: process.env.ACCOUNT,
  accounts: [
    {
      address: process.env.ACCOUNT,
      privateKey: process.env.PASSWD,
    },
  ],
};
const networkId = 42;

const solo = new Solo(url, networkId, options);

// const perpetual = new Perpetual(
// url,
// PerpetualMarket.PETH_USDC,
// Networks.ROSPTEN,
// options
// );

// await solo.standardActions.deposit({
// accountOwner: process.env.ACCOUNT,
// marketId: MarketId.ETH,
// amount: new BigNumber('1e16')
// });
(async () => {
  // await solo.token.setMaximumSoloAllowance(weth, process.env.ACCOUNT);

  // deposit to spot account
  // const result = await solo.standardActions.deposit({
    // accountOwner: process.env.ACCOUNT,
    // accountNumber: AccountNumbers.SPOT,
    // marketId: MarketId.ETH,
    // amount: new BigNumber('1e14')
  // });

  // const result = await solo.standardActions.deposit({
    // accountOwner: process.env.ACCOUNT,
    // marketId: MarketId.ETH,
    // amount: new BigNumber('1e17'),
  // });

  // const result = await solo.standardActions.withdraw({
    // accountOwner: process.env.ACCOUNT,
    // accountNumber: AccountNumbers.SPOT,
    // marketId: MarketId.ETH,
    // amount: new BigNumber('1e17'),
  // });



  // check spot account
  const account = await solo.api.getAccountBalances({
    accountOwner: process.env.ACCOUNT
  });
  console.log(account);
  // const soloLogs = solo.logs.parseLogs(result);
  // console.log(soloLogs);
})().then(console.log).catch(console.error);
