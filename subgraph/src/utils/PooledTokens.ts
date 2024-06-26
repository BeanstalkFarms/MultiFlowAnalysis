import { BigInt } from "@graphprotocol/graph-ts";

const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const USDC_WETH = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
const WETH_USDT = "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852";

// Use this mapping to determine which tokens are in each pool. Pools may each follow a distinct interface,
// so a view function shouldn't be used, and a new subgraph build is already required to track a newly whitelisted asset.
export function getTokensForPool(pool: string): string[] {
  for (let i = 0; i < poolTokens.length; ++i) {
    if (poolTokens[i].pool == pool) {
      return poolTokens[i].tokens;
    }
  }
  throw new Error("Pool has not been configured");
}

// Name/Decimals are not guaranteed as part of the ERC20 interface, so predefined values are necessary
export function getTokenInfo(token: string): TokenInfo {
  for (let i = 0; i < tokens.length; ++i) {
    if (tokens[i].address == token) {
      return tokens[i].info;
    }
  }
  throw new Error("Token has not been configured");
}

class PoolTokens {
  pool: string;
  tokens: string[];
}
// Add new pools here
const poolTokens: PoolTokens[] = [
  {
    pool: USDC_WETH,
    tokens: [USDC, WETH]
  },
  {
    pool: WETH_USDT,
    tokens: [WETH, USDT]
  }
];

class Token {
  address: string;
  info: TokenInfo;
}

class TokenInfo {
  name: string;
  decimals: BigInt;
}

// Add new tokens here
const tokens: Token[] = [
  {
    address: USDC,
    info: { name: "USDC", decimals: BigInt.fromU32(6) }
  },
  {
    address: USDT,
    info: { name: "USDT", decimals: BigInt.fromU32(6) }
  },
  {
    address: WETH,
    info: { name: "WETH", decimals: BigInt.fromU32(18) }
  }
];
