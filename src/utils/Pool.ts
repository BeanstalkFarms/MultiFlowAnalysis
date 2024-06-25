import { Pool } from "../../generated/schema";
import { getTokensForPool } from "./PooledTokens";
import { loadOrCreateToken } from "./Token";

export function loadOrCreatePool(poolAddress: string): Pool {
  let pool = Pool.load(poolAddress);
  if (pool == null) {
    pool = new Pool(poolAddress);
    pool.tokens = getTokensForPool(poolAddress);
    for (let i = 0; i < pool.tokens.length; ++i) {
      loadOrCreateToken(pool.tokens[i]);
    }
    pool.save();
  }
  return pool;
}
