-- SQL para actualizar la tabla companies con los campos de suscripción
-- Ejecutar en phpMyAdmin o consola MySQL

ALTER TABLE `companies` 
ADD COLUMN `subscription_id` varchar(100) DEFAULT NULL AFTER `sanitary_license`,
ADD COLUMN `subscription_status` varchar(20) DEFAULT 'active' AFTER `subscription_id`,
ADD COLUMN `subscription_expiry` datetime DEFAULT NULL AFTER `subscription_status`;
