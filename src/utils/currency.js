/**
 * Format amount in Indian Rupee notation (₹1,23,456.78)
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  
  // Indian numbering: first group of 3, then groups of 2
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = formatted + ',' + lastThree;
  }
  
  const result = decPart === '00' ? `₹${intPart}` : `₹${intPart}.${decPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Parse an INR string back to number
 */
export function parseINR(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[₹,]/g, '')) || 0;
}
