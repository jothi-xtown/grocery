// Utility functions for text formatting

/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string
 */
export const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Capitalizes only the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The string with first letter capitalized
 */
export const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Auto-capitalization handler for form inputs
 * @param {Event} e - The input event
 * @param {Function} onChange - The original onChange handler
 * @param {string} type - The capitalization type ('words' or 'first')
 */
export const handleAutoCapitalize = (e, onChange, type = 'words') => {
  const value = e.target.value;
  const capitalizedValue = type === 'words' ? capitalizeWords(value) : capitalizeFirst(value);
  
  // Create a new event with the capitalized value
  const newEvent = {
    ...e,
    target: {
      ...e.target,
      value: capitalizedValue
    }
  };
  
  onChange(newEvent);
};

/**
 * Capitalizes the first letter of text data for table display
 * Preserves barcodes, GST codes, IDs, and other codes as-is
 * @param {string} text - The text to capitalize
 * @param {string} fieldName - The field name to check if it should be preserved
 * @returns {string} - The capitalized text or original if it's a code/ID
 */
export const capitalizeTableText = (text, fieldName = '') => {
  if (!text || typeof text !== 'string') return text || '-';
  
  // Fields that should NOT be capitalized (keep as-is)
  const preserveFields = [
    'barCode', 'barcode', 'partNumber',
    'gst_pan_number', 'gstPanNumber', 'gst', 'gstPercent',
    'id', 'customerId', 'branchId', 'productId', 'supplierId', 'billId',
    'phone', 'pincode', 'email',
    'billNo', 'orderNumber', 'invoiceNo',
    'hsn_sac_code', 'hsnSacCode'
  ];
  
  // Check if field name indicates it should be preserved
  if (fieldName && preserveFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()))) {
    return text;
  }
  
  // Check if text looks like a code/ID (all caps, contains numbers, etc.)
  // If it's all uppercase with numbers/letters, or matches UUID pattern, keep as-is
  if (
    /^[A-Z0-9\-_]+$/.test(text) && text.length > 3 || // All caps with numbers/dashes
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(text) || // UUID
    /^[A-Z]{2,4}[0-9]+/.test(text) || // Codes like GST123, INV001
    /^[0-9]+$/.test(text) // Pure numbers
  ) {
    return text;
  }
  
  // Capitalize first letter of each word for regular text
  return capitalizeWords(text);
};
