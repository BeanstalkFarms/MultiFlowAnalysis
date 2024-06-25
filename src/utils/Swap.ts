import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadOrCreatePool } from "./Pool";
import { Swap } from "../../generated/schema";
import { Swap as SwapEvent } from "../../generated/uniswap/uniswap"
import { loadOrCreateToken, toDecimal } from "./Token";

export function handleSwapEntity(poolAddress: string, event: SwapEvent): void {
  let pool = loadOrCreatePool(poolAddress);
  let prevEntity: Swap | null = null;
  if (pool.prevSwap != null) {
    prevEntity = Swap.load(pool.prevSwap!)!;
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

  const reserve0bd = toDecimal(pool.reserves[0], loadOrCreateToken(pool.tokens[0]).decimals.toI32());
  const reserve1bd = toDecimal(pool.reserves[1], loadOrCreateToken(pool.tokens[1]).decimals.toI32());

  entity.newPrice = [reserve1bd.div(reserve0bd), reserve0bd.div(reserve1bd)];
  entity.newReserves = pool.reserves;

  // Calculate the percent changes
  if (prevEntity) {
    entity.percentPriceChange0 = entity.newPrice![0].minus(entity.prevPrice![0]).div(entity.prevPrice![0]);
    entity.percentPriceChange1 = entity.newPrice![1].minus(entity.prevPrice![1]).div(entity.prevPrice![1]);
    entity.percentReserveChange0 = (new BigDecimal(entity.newReserves![0].minus(entity.prevReserves![0]))).div(
      (new BigDecimal(entity.prevReserves![0])));
    entity.percentReserveChange1 = (new BigDecimal(entity.newReserves![1].minus(entity.prevReserves![1]))).div(
      (new BigDecimal(entity.prevReserves![1])));
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
