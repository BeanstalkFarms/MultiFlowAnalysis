import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadOrCreatePool } from "./Pool";
import { Liquidity } from "../../generated/schema";

export function handleLpTokenChange(poolAddress: string, amount: BigInt, event: ethereum.Event): void {
  let pool = loadOrCreatePool(poolAddress);
  let prevEntity = null;
  if (pool.prevLiquidity != null) {
    prevEntity = Liquidity.load(pool.prevLiquidity)!;
    prevEntity.nextEventBlock = event.block.number;
    prevEntity.save();
  }

  let entity = createLiquidityEntity(event);
  entity.pool = pool.id;
  entity.nextEventBlock = BigInt.fromI64(999999999999999);

  if (prevEntity) {
    entity.prevPrice = prevEntity.newPrice;
    entity.prevReserves = prevEntity.newReserves;
    entity.prevLpSupply = prevEntity.newLpSupply;

    entity.newLpSupply = entity.prevLpSupply.plus(amount);
    entity.percentLpSupplyChange = (new BigDecimal(entity.newLpSupply.minus(entity.prevLpSupply))).div(new BigDecimal(entity.prevLpSupply));
  } else {
    entity.newLpSupply = amount;
  }
  entity.txHash = event.transaction.hash.toHexString();
  entity.save();

  pool.prevLiquidity = entity.id;
  pool.prevEvent = entity.id;
  pool.prevEventType = "Liquidity";
  pool.save();
}

function createLiquidityEntity(event: ethereum.Event): Liquidity {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  return new Liquidity(id);
}
