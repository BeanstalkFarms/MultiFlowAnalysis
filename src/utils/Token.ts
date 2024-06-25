import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { getTokenInfo } from "./PooledTokens";

export function loadOrCreateToken(tokenAddress: string): Token {
  let token = Token.load(tokenAddress);
  if (token == null) {
    const tokenInfo = getTokenInfo(tokenAddress);
    token = new Token(tokenAddress);
    token.name = tokenInfo.name;
    token.decimals = tokenInfo.decimals;
    token.save();
  }
  return token;
}

export function toDecimal(value: BigInt, decimals: number = 6): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}
