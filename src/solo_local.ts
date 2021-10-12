import {
  Solo,
  Networks,
  MarketId,
  BigNumber,
  AccountNumbers,
  SoloOptions,
  address,
  Balance,
  ApiSide,
  ApiMarketName,
  SignedCanonicalOrder,
  CanonicalOrder,
  SigningMethod,
  ApiOrderV2,
  Integer,
  AccountInfo,
} from '@dydxprotocol/solo';

import { INTEGERS } from './lib/Constants';
import { expect, use } from 'chai';

import Web3 from 'web3';

class Server{
  public orderBook: SignedCanonicalOrder[];
  public maxCacheSize: number;
  constructor(maxCacheSize: number) {
    this.maxCacheSize = maxCacheSize;
    this.orderBook = [];
  }

  public postOrder(order: SignedCanonicalOrder): void {
    this.orderBook.push(order);
  }

  public async getOrderBook(): Promise<{orders: SignedCanonicalOrder[]}> {
    return { orders: this.orderBook };
  }
}

const url = 'http://127.0.0.1:8545';
const networkId = 1;
const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const sai = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
const BIP = new BigNumber('1e-4');
const server = new Server(100);

const web3 = new Web3(url);

let solo: Solo;
let defaultTakerAddress: address;
let defaultMakerAddress: address;
const defaultMakerNumber = new BigNumber('0');
const defaultTakerNumber = new BigNumber('0');

const impersonateOptions:{[index: string]: {
  holder:address, amount: Integer, contract: address}} = {
    USDC:{
      holder: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
      amount: new BigNumber('1e9'),
      contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    DAI:{
      holder: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
      amount: new BigNumber('1e10'),
      contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
  };

// trade in WETH-USDC market
const baseMarket = MarketId.WETH;
const quoteMarket = MarketId.USDC;
const defaultAmount = new BigNumber('1e18');
const defaultPrice = new BigNumber('1e-9');
const defaultQuoteAmount = defaultAmount.times(defaultPrice);
const defaultLimitFee = BIP.times(20);
const tokenAddresses:address[] = [];

async function checkMarkets() {
  const numMarkets = await solo.getters.getNumMarkets();
  console.log('num of markets in dydx: ', numMarkets);

  for (
    let marketId = new BigNumber(0);
    marketId < numMarkets;
    marketId = marketId.plus(1)
  ) {
    const tokenAddress: address = await solo.getters.getMarketTokenAddress(
      marketId,
    );
    // const tokenName = await solo.token.getSymbol(tokenAddress);
    // console.log('token name: ', tokenName, 'token address: ',
                // tokenAddress, 'market id: ', marketId);
    // gather erc20 token address
    tokenAddresses.push(tokenAddress);
  }
}

async function placeOrder(makerAccountOwner, price, amount,
  ):Promise<SignedCanonicalOrder> {
  // create signed order
  const order: SignedCanonicalOrder = await solo.api.createCanonicalOrder({
    price,
    amount,
    makerAccountOwner,
    postOnly: true,
    side: ApiSide.SELL,
    limitFee: defaultLimitFee,
    expiration: INTEGERS.ONES_31,
    market: ApiMarketName.WETH_USDC,
  });

  // submit order
  server.postOrder(order);
  return order;
}

async function fillOrder(
    order: SignedCanonicalOrder,
    {
          taker = defaultTakerAddress,
          takerNumber = defaultTakerNumber,
          amount = order.amount,
          price = order.limitPrice,
          fee = INTEGERS.ZERO,
        },
  ) {
  const actionOperation = solo.operation.initiate().fillCanonicalOrder(
          taker,
          takerNumber,
          order,
          amount,
          price,
          fee,
        );
  return actionOperation.commit({ from: taker });
}

async function impersonateAndTransfer(user: address, amount: Integer) {
  const options = impersonateOptions.USDC;
  await solo.token.transfer(options.contract, options.holder, user, options.amount);
}

// async function impersonate(accounts) {
  // for (const account of accounts) {
    // await network.provider.request({
      // method: 'hardhat_impersonateAccount',
      // params: [account],
    // });
  // }
// }

async function setBalance() {
  // transfer erc20 token to accounts first
  await impersonateAndTransfer(defaultTakerAddress, defaultQuoteAmount);
  // await impersonateAndTransfer(seller);

  // deposit eth for seller
  await solo.standardActions.deposit({
    accountOwner: defaultMakerAddress,
    accountNumber: defaultMakerNumber,
    marketId: MarketId.ETH,
    amount: defaultAmount, // 1 eth
  });

  // deposit usdc for buyer
  await solo.standardActions.deposit({
    accountOwner: defaultTakerAddress,
    accountNumber: defaultTakerNumber,
    marketId: MarketId.USDC,
    amount: defaultQuoteAmount, // 1000 usdc
  });
}

async function setAllowance() {
  const accounts = [defaultMakerAddress, defaultTakerAddress];
  for (const account of accounts) {
    await solo.token.setMaximumSoloAllowance(usdc, account);
    await solo.token.setMaximumSoloAllowance(weth, account);
  }
}

async function checkAccounts() {
  const accounts: {owner: address, number: Integer}[] = [
    { owner: defaultTakerAddress, number: defaultTakerNumber },
    { owner: defaultMakerAddress, number: defaultMakerNumber },
  ];

  for (const account of accounts) {
    const balance:Balance[] = await solo.getters.getAccountBalances(
    account.owner,
    account.number,
  );
    console.log('account: ', account, 'balance: ', balance);
  }
}

// check balance
async function expectBalance(
  takerBaseExpected: Integer,
  takerQuoteExpected: Integer,
  makerBaseExpected: Integer,
  makerQuoteExpected: Integer,
  taker: address= defaultTakerAddress, maker: address= defaultMakerAddress) {
  const [
        takerBaseWei,
        takerQuoteWei,
        makerBaseWei,
        makerQuoteWei,
      ] = await Promise.all([
        solo.getters.getAccountWei(
          defaultTakerAddress,
          defaultTakerNumber,
          baseMarket,
        ),
        solo.getters.getAccountWei(
                  defaultTakerAddress,
                  defaultTakerNumber,
                  quoteMarket,
                ),
        solo.getters.getAccountWei(
                  defaultMakerAddress,
                  defaultMakerNumber,
                  baseMarket,
                ),
        solo.getters.getAccountWei(
                  defaultMakerAddress,
                  defaultMakerNumber,
                  quoteMarket,
                )]);
  expect(takerBaseWei).to.equal(takerBaseExpected);
  expect(takerQuoteWei).to.equal(takerQuoteExpected);
  expect(makerBaseWei).to.equal(makerBaseExpected);
  expect(makerQuoteWei).to.equal(makerQuoteExpected);
}

function matchOrder(orders: SignedCanonicalOrder[]): SignedCanonicalOrder {
  return orders[0];
}

// check order
async function expectFilledAmount(
    order: CanonicalOrder,
    expectedFilledAmount: Integer,
  ) {
  const states = await solo.canonicalOrders.getOrderStates([order]);
  console.log('status: ', states[0].status, 'filledAmount: ', states[0].totalFilledAmount);
  // expect(states[0].totalFilledAmount).to.equal(expectedFilledAmount);
}

(async () => {
  const accounts: address[] = await web3.eth.getAccounts();
  const owner: address = accounts[0];

  // solo client
  solo = new Solo(url, networkId, {});
  // the order can filled by the taker only
  defaultTakerAddress = await solo.canonicalOrders.getTakerAddress();
  defaultMakerAddress = accounts[1];

  // check markets
  await checkMarkets();

  // display account balance in all markets
  await setAllowance();
  await setBalance();
  await checkAccounts();

  // 1. maker place orders to server
  // sign order and submit all maker orders to server
  const order = await placeOrder(defaultMakerAddress, defaultPrice, defaultAmount);

  // 2. taker fetch orderbook from server, then fill order and post
  // all into solo margin contract
  const { orders: orders } = await server.getOrderBook();
  const matchedOrder = matchOrder(orders);
  await fillOrder(matchedOrder, {});
  await checkAccounts();
  // await expectBalance(INTEGERS.ZERO, defaultQuoteAmount, defaultAmount, INTEGERS.ZERO);
  await expectFilledAmount(order, defaultAmount);
})().then(console.log).catch(console.error);
