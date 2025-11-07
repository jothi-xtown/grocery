-- Fix purchase_order table schema
-- This script adds default NULL values to addressId and shippingAddressId columns
-- Run this script directly on your MySQL database

-- First, check if columns allow NULL (they should, but let's make sure)
ALTER TABLE `purchase_order` 
MODIFY COLUMN `addressId` CHAR(36) NULL DEFAULT NULL,
MODIFY COLUMN `shippingAddressId` CHAR(36) NULL DEFAULT NULL;

-- Verify the changes
-- SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'purchase_order' 
-- AND COLUMN_NAME IN ('addressId', 'shippingAddressId');

