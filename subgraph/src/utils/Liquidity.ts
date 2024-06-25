import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadOrCreatePool } from "./Pool";
import { Liquidity } from "../../generated/schema";

const BD_100 = BigDecimal.fromString("100");

export function handleLpTokenChange(poolAddress: string, amount: BigInt, event: ethereum.Event): void {
  let pool = loadOrCreatePool(poolAddress);
  let prevEntity: Liquidity | null = null;
  if (pool.prevLiquidity != null) {
    prevEntity = Liquidity.load(pool.prevLiquidity!)!;
    prevEntity.nextEventBlock = event.block.number;
    prevEntity.blockDiff = prevEntity.nextEventBlock!.minus(prevEntity.eventBlock);
    prevEntity.save();
  }

  let entity = createLiquidityEntity(event);
  entity.pool = pool.id;
  entity.eventBlock = event.block.number;

  if (prevEntity) {
    entity.prevPrice = pool.price;
    entity.prevReserves = pool.reserves;
    entity.prevLpSupply = prevEntity.newLpSupply;

    entity.newLpSupply = entity.prevLpSupply!.plus(amount);
    entity.percentLpSupplyChange = (new BigDecimal(entity.newLpSupply.minus(entity.prevLpSupply!))).div(new BigDecimal(entity.prevLpSupply!)).times(BD_100);
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
