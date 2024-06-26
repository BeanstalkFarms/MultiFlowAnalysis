import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadOrCreatePool } from "./Pool";
import { Swap } from "../../generated/schema";
import { Swap as SwapEvent } from "../../generated/usdcweth/uniswap"

const BD_100 = BigDecimal.fromString("100");

export function handleSwapEntity(poolAddress: string, event: SwapEvent): void {
  let pool = loadOrCreatePool(poolAddress);
  let prevEntity: Swap | null = null;
  if (pool.prevSwap != null) {
    prevEntity = Swap.load(pool.prevSwap!)!;
    prevEntity.nextEventBlock = event.block.number;
    prevEntity.blockDiff = prevEntity.nextEventBlock!.minus(prevEntity.eventBlock);
    prevEntity.save();
  }

  let entity = createSwapEntity(event);
  entity.pool = pool.id;
  entity.eventBlock = event.block.number;
  entity.eventLogIndex = event.logIndex;
  pool.swapCount = pool.swapCount.plus(BigInt.fromU32(1));
  entity.count = pool.swapCount;

  if (pool.prevPrice) {
    entity.prevPrice = pool.prevPrice;
    entity.prevReserves = pool.prevReserves;
  }

  // This will have been set by the preceding Sync event
  entity.newPrice = pool.price;
  entity.newReserves = pool.reserves;

  // Calculate the percent changes
  if (pool.prevPrice && pool.prevReserves) {
    entity.percentPriceChange0 = entity.newPrice![0].minus(entity.prevPrice![0]).div(entity.prevPrice![0]).times(BD_100);
    entity.percentPriceChange1 = entity.newPrice![1].minus(entity.prevPrice![1]).div(entity.prevPrice![1]).times(BD_100);
    entity.percentReserveChange0 = (new BigDecimal(entity.newReserves![0].minus(entity.prevReserves![0]))).div(
      (new BigDecimal(entity.prevReserves![0]))).times(BD_100);
    entity.percentReserveChange1 = (new BigDecimal(entity.newReserves![1].minus(entity.prevReserves![1]))).div(
      (new BigDecimal(entity.prevReserves![1]))).times(BD_100);
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
