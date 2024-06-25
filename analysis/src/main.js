const { multiflowSG, gql } = require("./subgraph-client");

(async () => {

  const result = await multiflowSG(gql`
    {
      liquidities(
        where: {percentLpSupplyChange_gt: "1"}
        first: 5
      ) {
        id
        blockDiff
        txHash
        percentPriceChange0
        percentPriceChange1
        percentReserveChange0
        percentReserveChange1
        percentLpSupplyChange
        prevLpSupply
        newLpSupply
        prevPrice
        newPrice
        prevReserves
        newReserves
      }
    }
  `);
  console.log('subgraph result: ', result.liquidities);

})();
