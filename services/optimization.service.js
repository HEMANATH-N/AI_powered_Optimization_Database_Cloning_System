const optimizeFile = (originalSize) => {
  // Simulate AI-powered compression (20-45% reduction)
  const compressionFactor = 0.55 + Math.random() * 0.25;
  const optimizedSize = Math.floor(originalSize * compressionFactor);
  const compressionPercent = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
  return { optimizedSize, compressionPercent };
};

module.exports = { optimizeFile };
