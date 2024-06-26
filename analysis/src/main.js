const { getContractAsync } = require("./datasources/contracts");
const { multiflowSG, gql } = require("./datasources/subgraph-client");
const abi = require('../../abis/uniswap.json');
const SubgraphQueryUtil = require("./datasources/subgraph-query");
const { calculateMean, calculateMedian, calculateMode } = require("./math");
const fs = require('fs');
const { providerThenable } = require("./datasources/alchemy");

const USDC_WETH = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";

const END_BLOCK = 20172395;
// Blocks for which to produce the report
const BLOCKS = {
  [USDC_WETH]: [
    10200000,
    // 10400000,
    // 10500000,
    // 11000000,
    // 12000000,
    // 13500000,
    // 15000000,
    // 18000000,
    // END_BLOCK
  ]
};

// Percent thresholds for which to include results
const PERCENT_THRESHOLDS = {
  [USDC_WETH]: [
    // 0.01,
    // 0.05,
    // 0.1,
    // 0.25,
    // 0.5,
    // 0.75,
    // 1,
    1.5,
    2,
    5
  ]
};

function querySwapsAndLiquidity(percent, block) {

  let blockQuery =`block: {number: ${block}}`;
  blockQuery = ''; // seems that block is not working with respect to the testing subgraph

  const swapsPromise = SubgraphQueryUtil.allPaginatedSG(
    multiflowSG,
    `
      {
        swaps {
          count
          eventBlock
          blockDiff
        }
      }
    `,
    blockQuery,
    `pool: "${USDC_WETH}", percentPriceChange0_gt: "${percent}"`,
    ['eventBlock'],
    [0],
    'asc'
  );

  const liquidityPromise = SubgraphQueryUtil.allPaginatedSG(
    multiflowSG,
    `
      {
        liquidities {
          count
          eventBlock
          blockDiff
        }
      }
    `,
    blockQuery,
    `pool: "${USDC_WETH}", percentLpSupplyChange_gt: "${percent}"`,
    ['eventBlock'],
    [0],
    'asc'
  );

  return Promise.all([swapsPromise, liquidityPromise]);
}

async function queryRecentBlockTimes(provider, entities) {
  const SPREAD = [-1, -10, -50, -100];
  const promises = [];

  const count = entities.length;
  
  for (const prev of SPREAD) {
    if (count >= Math.abs(prev)) {
      promises.push(provider.getBlock(parseInt(entities[count + prev].eventBlock)).then(b => new Date(b.timestamp * 1000)));
    }
  }

  const resolved = await Promise.all(promises);
  const results = {};
  for (let i = 0; i < resolved.length; ++i) {
    results[SPREAD[i]] = resolved[i];
  }
  return results;
}

(async () => {

  const provider = await providerThenable;
  const report = {};

  const pools = (await multiflowSG(gql`
    {
      pools {
        id
        swapCount
        liquidityCount
      }
    }`)).pools;
  
  for (const pool of pools) {

    const reportPool = report[`pool:${pool.id}`] = {};

    const POOL_BLOCKS = BLOCKS[pool.id];
    const POOL_PERCENTS = PERCENT_THRESHOLDS[pool.id];
    for (const percent of POOL_PERCENTS) {

      const reportPercent = reportPool[`percent:${percent}`] = {};
      for (const block of POOL_BLOCKS) {
    
        const [swaps, liquidity] = await querySwapsAndLiquidity(percent, block);

        const priceSpread = meanAndMode(swaps, ['count', 'eventBlock', 'blockDiff']);
        const liquiditySpread = meanAndMode(liquidity, ['count', 'eventBlock', 'blockDiff']);

        const [recentPrice, recentLiquidity] = await Promise.all([
          queryRecentBlockTimes(provider, swaps),
          queryRecentBlockTimes(provider, liquidity)
        ]);

        reportPercent[`end-block:${block}`] = {
          price: {
            count: swaps.length,
            total: parseInt(pool.swapCount),
            percent: (swaps.length / pool.swapCount) * 100,
            analysis: {
              meanCount: priceSpread.count.mean,
              medianCount: priceSpread.count.median,
              meanBlock: priceSpread.eventBlock.mean,
              medianBlock: priceSpread.eventBlock.median,
              meanBlockDiff: priceSpread.blockDiff.mean,
              medianBlockDiff: priceSpread.blockDiff.median,
              modeBlockDiff: priceSpread.blockDiff.mode,
              recentOccurrences: recentPrice
            }
          },
          liquidity: {
            count: liquidity.length,
            total: parseInt(pool.liquidityCount),
            percent: (liquidity.length / pool.liquidityCount) * 100,
            analysis: {
              meanCount: liquiditySpread.count.mean,
              medianCount: liquiditySpread.count.median,
              meanBlock: liquiditySpread.eventBlock.mean,
              medianBlock: liquiditySpread.eventBlock.median,
              meanBlockDiff: liquiditySpread.blockDiff.mean,
              medianBlockDiff: liquiditySpread.blockDiff.median,
              modeBlockDiff: liquiditySpread.blockDiff.mode,
              recentOccurrences: recentLiquidity
            }
          }
        }
      }
    }
  }
  await fs.promises.writeFile(`results/analysis.json`, JSON.stringify(report, null, 2));

})();

// Calculates the mean/median/mode of the given properties
function meanAndMode(objects, propertyList) {
  return propertyList.reduce((result, property) => {
    const numbers = objects.map(o => parseInt(o[property]));
    result[property] = {
      mean: calculateMean(numbers),
      median: calculateMedian(numbers),
      mode: calculateMode(numbers)[0],
    }
    return result;
  }, {});
}
