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
  if (pool.prevEventType == "Swap") {

    let swap = Swap.load(pool.prevEvent!)!;
    const reserve0 = toDecimal(event.params.reserve0, loadOrCreateToken(pool.tokens[0]).decimals.toI32());
    const reserve1 = toDecimal(event.params.reserve1, loadOrCreateToken(pool.tokens[1]).decimals.toI32());

    swap.newPrice = [reserve1.div(reserve0), reserve0.div(reserve1)];
    swap.newReserves = [event.params.reserve0, event.params.reserve1];

    // Calculate the percent changes
    if (swap.prevPrice != null && swap.prevReserves != null) {
      swap.percentPriceChange0 = swap.newPrice[0].minus(swap.prevPrice[0]).div(swap.prevPrice[0]);
      swap.percentPriceChange1 = swap.newPrice[1].minus(swap.prevPrice[1]).div(swap.prevPrice[1]);
      swap.percentReserveChange0 = (new BigDecimal(swap.newReserves[0].minus(swap.prevReserves[0]))).div(
        (new BigDecimal(swap.prevReserves[0])));
        swap.percentReserveChange1 = (new BigDecimal(swap.newReserves[1].minus(swap.prevReserves[1]))).div(
        (new BigDecimal(swap.prevReserves[1])));
    }
    swap.save();

  } else if (pool.prevEventType == "Liquidity") {
    let liquidity = Liquidity.load(pool.prevEvent!)!;
    const reserve0 = toDecimal(event.params.reserve0, loadOrCreateToken(pool.tokens[0]).decimals.toI32());
    const reserve1 = toDecimal(event.params.reserve1, loadOrCreateToken(pool.tokens[1]).decimals.toI32());

    liquidity.newPrice = [reserve1.div(reserve0), reserve0.div(reserve1)];
    liquidity.newReserves = [event.params.reserve0, event.params.reserve1];

    // Calculate the percent changes
    if (liquidity.prevPrice != null && liquidity.prevReserves != null) {
      liquidity.percentPriceChange0 = liquidity.newPrice[0].minus(liquidity.prevPrice[0]).div(liquidity.prevPrice[0]);
      liquidity.percentPriceChange1 = liquidity.newPrice[1].minus(liquidity.prevPrice[1]).div(liquidity.prevPrice[1]);
      liquidity.percentReserveChange0 = (new BigDecimal(liquidity.newReserves[0].minus(liquidity.prevReserves[0]))).div(
        (new BigDecimal(liquidity.prevReserves[0])));
      liquidity.percentReserveChange1 = (new BigDecimal(liquidity.newReserves[1].minus(liquidity.prevReserves[1]))).div(
        (new BigDecimal(liquidity.prevReserves[1])));
    }
    liquidity.save();
  }
}
