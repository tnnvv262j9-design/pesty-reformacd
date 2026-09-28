-- Agregar columnas para integración con Ecart Pay
ALTER TABLE `companies` 
ADD COLUMN IF NOT EXISTS `ecartpay_customer_id` VARCHAR(255) NULL AFTER `subscription_status`,
ADD COLUMN IF NOT EXISTS `ecartpay_subscription_id` VARCHAR(255) NULL AFTER `ecartpay_customer_id`;
