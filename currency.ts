// Currency utility functions for AED (United Arab Emirates Dirham)

export function formatAED(price: string | number): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numericPrice)) {
    return 'AED 0.00';
  }
  
  return `AED ${numericPrice.toFixed(2)}`;
}

export function formatAEDShort(price: string | number): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numericPrice)) {
    return 'AED 0';
  }
  
  // For prices over 1000, show 1K, 2.5K etc.
  if (numericPrice >= 1000) {
    return `AED ${(numericPrice / 1000).toFixed(numericPrice % 1000 === 0 ? 0 : 1)}K`;
  }
  
  return `AED ${numericPrice.toFixed(numericPrice % 1 === 0 ? 0 : 2)}`;
}

export function parseAEDPrice(priceString: string): number {
  // Extract numeric value from AED price string
  const numericString = priceString.replace(/[^0-9.]/g, '');
  return parseFloat(numericString) || 0;
}