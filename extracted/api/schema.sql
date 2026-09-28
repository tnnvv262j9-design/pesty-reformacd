-- ESQUEMA COMPLETO DE BASE DE DATOS PESTY
-- Ejecutar en phpMyAdmin o consola MySQL

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `companies`
--

CREATE TABLE IF NOT EXISTS `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `admin_code` varchar(50) NOT NULL,
  `plan` varchar(50) DEFAULT 'trial',
  `module_access` text,
  `limit_services` int(11) DEFAULT 5,
  `limit_clients` int(11) DEFAULT 5,
  `limit_techs` int(11) DEFAULT 1,
  `limit_quotes` int(11) DEFAULT 5,
  `limit_payment_notes` int(11) DEFAULT 5,
  `limit_library` int(11) DEFAULT 0,
  `limit_chemicals` int(11) DEFAULT 0,
  `brand_color` varchar(20) DEFAULT '#2563eb',
  `logo_url` varchar(255) DEFAULT NULL,
  `theme` varchar(20) DEFAULT 'dark',
  `date_format` varchar(20) DEFAULT 'DD/MM/YYYY',
  `time_format` varchar(20) DEFAULT '24h',
  `language` varchar(10) DEFAULT 'es',
  `currency_code` varchar(10) DEFAULT 'MXN',
  `currency_symbol` varchar(5) DEFAULT '$',
  `currency_decimals` int(11) DEFAULT 2,
  `report_footer_text` text,
  `billing_prefix` varchar(20) DEFAULT 'INV',
  `billing_next_number` int(11) DEFAULT 1,
  `contact_phone` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_address` text,
  `sanitary_license` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `admin_code` (`admin_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clients`
--

CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `notes` text,
  `zone` varchar(100) DEFAULT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `access_code` varchar(20) DEFAULT NULL,
  `map_url` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `access_code` (`access_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `client_sites`
--

CREATE TABLE IF NOT EXISTS `client_sites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `address` text,
  `notes` text,
  `risk_level` varchar(20) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `technicians`
--

CREATE TABLE IF NOT EXISTS `technicians` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `access_code` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `base_salary` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `access_code` (`access_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services`
--

CREATE TABLE IF NOT EXISTS `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `client_site_id` int(11) DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pendiente',
  `service_date` date DEFAULT NULL,
  `service_time` time DEFAULT NULL,
  `service_type` varchar(255) DEFAULT NULL,
  `pests` varchar(255) DEFAULT NULL,
  `notes` text,
  `price` decimal(10,2) DEFAULT NULL,
  `reinforcement_days` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL COMMENT '1-5 Stars',
  `rating_comment` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`),
  KEY `client_site_id` (`client_site_id`),
  KEY `technician_id` (`technician_id`),
  KEY `service_date` (`service_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `products`
--

CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `active_ingredient` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `stock` float DEFAULT 0,
  `primary_use` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `service_products`
--

CREATE TABLE IF NOT EXISTS `service_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity_used` float NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `quotes`
--

CREATE TABLE IF NOT EXISTS `quotes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `items` json DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invoices`
--

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `quote_id` int(11) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `client_rfc` varchar(20) DEFAULT NULL,
  `cfdi_use` varchar(100) DEFAULT NULL,
  `tax_regime` varchar(100) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_form` varchar(100) DEFAULT NULL,
  `issuer_rfc` varchar(20) DEFAULT NULL,
  `expedition_place` varchar(200) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'MXN',
  `exchange_rate` decimal(10,4) DEFAULT 1.0000,
  `items` json DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `tax` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `expenses`
--

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `date` date DEFAULT NULL,
  `description` text,
  `amount` decimal(10,2) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `technician_id` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payment_notes`
--

CREATE TABLE IF NOT EXISTS `payment_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `service_id` int(11) DEFAULT NULL,
  `note_date` date DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `tax_amount` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`),
  KEY `service_id` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reminders`
--

CREATE TABLE IF NOT EXISTS `reminders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `date` date DEFAULT NULL,
  `text` text,
  `is_completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chemicals`
--

CREATE TABLE IF NOT EXISTS `chemicals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `concentration` varchar(100) DEFAULT NULL,
  `quantity_bought_ml` float DEFAULT 0,
  `price_total` decimal(10,2) DEFAULT 0.00,
  `current_stock_ml` float DEFAULT 0,
  `min_stock_ml` float DEFAULT 0,
  `cost_per_ml` decimal(10,4) DEFAULT 0.0000,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chemical_usage`
--

CREATE TABLE IF NOT EXISTS `chemical_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) NOT NULL,
  `chemical_id` int(11) NOT NULL,
  `quantity_used` float NOT NULL,
  `unit_used` varchar(20) DEFAULT 'ml',
  `ml_used` float NOT NULL,
  `cost_at_time` decimal(10,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `chemical_id` (`chemical_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventory_history`
--

CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `chemical_id` int(11) NOT NULL,
  `change_type` varchar(50) NOT NULL,
  `quantity_change` float NOT NULL,
  `previous_stock` float DEFAULT 0,
  `new_stock` float DEFAULT 0,
  `reference_id` int(11) DEFAULT NULL,
  `notes` text,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `chemical_id` (`chemical_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chemical_documents`
--

CREATE TABLE IF NOT EXISTS `chemical_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `chemical_id` int(11) NOT NULL,
  `type` enum('datasheet','method') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `uploaded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `chemical_id` (`chemical_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cebaderos`
--

CREATE TABLE IF NOT EXISTS `cebaderos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `area_type` varchar(50) NOT NULL,
  `location` text NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `target` varchar(50) NOT NULL,
  `bait_product` varchar(255) DEFAULT NULL,
  `active_ingredient` varchar(255) DEFAULT NULL,
  `cofepris_registry` varchar(100) DEFAULT NULL,
  `bait_expiry_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `last_inspection` date DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code_company` (`company_id`,`code`),
  KEY `company_id` (`company_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cebadero_inspections`
--

CREATE TABLE IF NOT EXISTS `cebadero_inspections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cebadero_id` int(11) NOT NULL,
  `inspection_date` datetime NOT NULL,
  `tech_id` int(11) NOT NULL,
  `condition_status` varchar(50) NOT NULL,
  `activity_level` varchar(50) NOT NULL,
  `action_taken` varchar(50) NOT NULL,
  `amount_replenished` varchar(50) DEFAULT NULL,
  `evidence_photo_url` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cebadero_id` (`cebadero_id`),
  KEY `tech_id` (`tech_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_messages`
--

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `direction` enum('to_company','to_tech') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_tech` (`company_id`,`technician_id`),
  KEY `idx_unread` (`company_id`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_log`
--

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `module` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `user_id` (`user_id`),
  KEY `module` (`module`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `system_maintenance`
--

CREATE TABLE IF NOT EXISTS `system_maintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `feature_key` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_key` (`feature_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `system_maintenance`
--

INSERT IGNORE INTO `system_maintenance` (`feature_key`, `module`, `description`, `is_active`) VALUES
('techs_epp', 'techs', 'Botón de EPP en Módulo de Técnicos', 1),
('techs_add', 'techs', 'Agregar Nuevo Técnico', 1),
('clients_add', 'clients', 'Agregar Nuevo Cliente', 1),
('services_add', 'services', 'Agendar Nuevo Servicio', 1),
('reports_generate', 'reports', 'Generar Reportes PDF', 1),
('inventory_edit', 'inventory', 'Editar Inventario', 1),
('calendar_view', 'calendar', 'Ver Calendario', 1),
('quotes_create', 'quotes', 'Crear Cotización', 1);

-- --------------------------------------------------------

--
-- Tablas de EPP
--

CREATE TABLE IF NOT EXISTS `epp_deliveries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `delivery_date` date NOT NULL,
  `equipment_type` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` varchar(50) NOT NULL,
  `equipment_status` varchar(50) NOT NULL,
  `expiration_date` date DEFAULT NULL,
  `signature_path` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `technician_id` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epp_catalog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `size` varchar(50) DEFAULT NULL,
  `certification` varchar(100) DEFAULT NULL,
  `supplier` varchar(150) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epp_maintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `epp_delivery_id` int(11) NOT NULL,
  `maintenance_date` date NOT NULL,
  `type` varchar(100) NOT NULL,
  `performed_by` varchar(150) DEFAULT NULL,
  `notes` text,
  `evidence_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `epp_delivery_id` (`epp_delivery_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epp_training` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `course_name` varchar(150) NOT NULL,
  `provider` varchar(150) DEFAULT NULL,
  `training_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `certificate_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `technician_id` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epp_service_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `epp_delivery_id` int(11) DEFAULT NULL,
  `equipment_type` varchar(100) NOT NULL,
  `used_quantity` int(11) NOT NULL,
  `notes` text,
  `evidence_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `service_id` (`service_id`),
  KEY `technician_id` (`technician_id`),
  KEY `epp_delivery_id` (`epp_delivery_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epp_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `epp_delivery_id` int(11) NOT NULL,
  `doc_type` varchar(50) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `epp_delivery_id` (`epp_delivery_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
