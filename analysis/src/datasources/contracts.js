const { Contract } = require('alchemy-sdk');
const { providerThenable } = require('./alchemy.js');

const contracts = {};
async function getContractAsync(address, abi, blockNumber = 0) {
  const key = JSON.stringify({ address, blockNumber });
  if (!contracts[key]) {
    contracts[key] = new Contract(address, abi, await providerThenable);
  }
  return contracts[key];
}

module.exports = {
  getContractAsync,
};
