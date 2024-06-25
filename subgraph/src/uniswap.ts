import { BigDecimal } from "@graphprotocol/graph-ts"
import { Liquidity, Pool, Swap } from "../generated/schema"
import {
  Swap as SwapEvent,
  Sync as SyncEvent,
  Transfer as TransferEvent
} from "../generated/uniswap/uniswap"
import { handleLpTokenChange } from "./utils/Liquidity"
import { loadOrCreateToken, toDecimal } from "./utils/Token"
import { handleSwapEntity } from "./utils/Swap"

/// For Swaps, the event order is Sync -> Swap. Use Sync to update reserves only, do all calculation in Swap.
/// For Liquidity, the event order is Transfer -> Sync -> Mint | Burn. Use Transfer to identify
///   how many lp tokens are transacted, and Sync to perform any relevant reserve/price calculations.   

const BD_100 = BigDecimal.fromString("100");

// For trades
export function handleSwap(event: SwapEvent): void {
  handleSwapEntity(event.address.toHexString(), event);
}

// For add/remove liquidity
export function handleTransfer(event: TransferEvent): void {
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    // Mint
    handleLpTokenChange(event.address.toHexString(), event.params.value, event);

  } else if (event.params.to.toHexString() == "0x0000000000000000000000000000000000000000") {
    // Burn
    handleLpTokenChange(event.address.toHexString(), event.params.value.neg(), event);
  }
}

// For tracking all actual reserve changes
export function handleSync(event: SyncEvent): void {
  let pool = Pool.load(event.address.toHexString())!;
  pool.prevPrice = pool.price;
  pool.prevReserves = pool.reserves;

  const reserve0bd = toDecimal(event.params.reserve0, loadOrCreateToken(pool.tokens[0]).decimals.toI32());
  const reserve1bd = toDecimal(event.params.reserve1, loadOrCreateToken(pool.tokens[1]).decimals.toI32());
  pool.price = [reserve1bd.div(reserve0bd), reserve0bd.div(reserve1bd)];
  pool.reserves = [event.params.reserve0, event.params.reserve1];

  if (pool.prevEventType == "Liquidity") {
    let liquidity = Liquidity.load(pool.prevEvent!)!;
    liquidity.newPrice = pool.price;
    liquidity.newReserves = pool.reserves;

    // Calculate the percent changes
    if (liquidity.prevPrice != null && liquidity.prevReserves != null) {
      liquidity.percentPriceChange0 = liquidity.newPrice![0].minus(liquidity.prevPrice![0]).div(liquidity.prevPrice![0]).times(BD_100);
      liquidity.percentPriceChange1 = liquidity.newPrice![1].minus(liquidity.prevPrice![1]).div(liquidity.prevPrice![1]).times(BD_100);
      liquidity.percentReserveChange0 = (new BigDecimal(liquidity.newReserves![0].minus(liquidity.prevReserves![0]))).div(
        (new BigDecimal(liquidity.prevReserves![0]))).times(BD_100);
      liquidity.percentReserveChange1 = (new BigDecimal(liquidity.newReserves![1].minus(liquidity.prevReserves![1]))).div(
        (new BigDecimal(liquidity.prevReserves![1]))).times(BD_100);
    }
    liquidity.save();
  }
  pool.prevEventType = null;
  pool.save();
}
