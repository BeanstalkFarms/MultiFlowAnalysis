function calculateMean(numbers) {
  const total = numbers.reduce((acc, num) => acc + num, 0);
  return total / numbers.length;
}

function calculateMedian(numbers) {
  const sortedNumbers = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sortedNumbers.length / 2);

  if (sortedNumbers.length % 2 === 0) {
      return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
  }
  return sortedNumbers[mid];
}

function calculateMode(numbers) {
  const frequencyMap = {};
  let maxFreq = 0;
  let modes = [];

  numbers.forEach(num => {
      if (frequencyMap[num]) {
          frequencyMap[num]++;
      } else {
          frequencyMap[num] = 1;
      }

      if (frequencyMap[num] > maxFreq) {
          maxFreq = frequencyMap[num];
          modes = [num];
      } else if (frequencyMap[num] === maxFreq) {
          if (!modes.includes(num)) {
              modes.push(num);
          }
      }
  });

  return modes;
}

module.exports = {
  calculateMean,
  calculateMedian,
  calculateMode
};
