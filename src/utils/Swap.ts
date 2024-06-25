import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadOrCreatePool } from "./Pool";
import { Swap } from "../../generated/schema";

export function handleSwapEntity(poolAddress: string, event: ethereum.Event): void {
  let pool = loadOrCreatePool(poolAddress);
  let prevEntity = null;
  if (pool.prevSwap != null) {
    prevEntity = Swap.load(pool.prevSwap)!;
    prevEntity.nextEventBlock = event.block.number;
    prevEntity.save();
  }

  let entity = createSwapEntity(event);
  entity.pool = pool.id;
  entity.nextEventBlock = BigInt.fromI64(999999999999999);

  if (prevEntity) {
    entity.prevPrice = prevEntity.newPrice;
    entity.prevReserves = prevEntity.newReserves;
  }
  entity.txHash = event.transaction.hash.toHexString();
  entity.save();

  pool.prevSwap = entity.id;
  pool.prevEvent = entity.id;
  pool.prevEventType = "Swap";
  pool.save();
}

function createSwapEntity(event: ethereum.Event): Swap {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  return new Swap(id);
}
