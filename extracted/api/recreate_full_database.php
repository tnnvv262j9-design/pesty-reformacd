<?php
include 'db_connect.php';

// Deshabilitar límite de tiempo para ejecuciones largas
set_time_limit(0);

echo "<h1>Recreando Base de Datos Completa</h1>";
echo "<p>Este script intentará crear todas las tablas necesarias si no existen.</p>";

$queries = [];

// --- 1. TABLAS PRINCIPALES ---

// Companies (Empresas)
$queries['companies'] = "CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    admin_code VARCHAR(50) NOT NULL,
    plan VARCHAR(50) DEFAULT 'trial',
    module_access TEXT, -- JSON
    
    -- Límites del plan
    limit_services INT DEFAULT 5,
    limit_clients INT DEFAULT 5,
    limit_techs INT DEFAULT 1,
    limit_quotes INT DEFAULT 5,
    limit_payment_notes INT DEFAULT 5,
    limit_library INT DEFAULT 0,
    limit_chemicals INT DEFAULT 0,
    
    -- Configuración
    brand_color VARCHAR(20) DEFAULT '#2563eb',
    logo_url VARCHAR(255),
    theme VARCHAR(20) DEFAULT 'dark',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(20) DEFAULT '24h',
    language VARCHAR(10) DEFAULT 'es',
    currency_code VARCHAR(10) DEFAULT 'MXN',
    currency_symbol VARCHAR(5) DEFAULT '$',
    currency_decimals INT DEFAULT 2,
    
    -- Reportes y Facturación
    report_footer_text TEXT,
    billing_prefix VARCHAR(20) DEFAULT 'INV',
    billing_next_number INT DEFAULT 1,
    
    -- Contacto
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    contact_address TEXT,
    sanitary_license VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (email),
    INDEX (admin_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Clients (Clientes)
$queries['clients'] = "CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    zone VARCHAR(100),
    frequency VARCHAR(50),
    type VARCHAR(50),
    access_code VARCHAR(20),
    map_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (access_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Client Sites (Sucursales)
$queries['client_sites'] = "CREATE TABLE IF NOT EXISTS client_sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) DEFAULT NULL,
    address TEXT,
    notes TEXT,
    risk_level VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Technicians (Técnicos)
$queries['technicians'] = "CREATE TABLE IF NOT EXISTS technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    access_code VARCHAR(50),
    start_date DATE DEFAULT NULL,
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (access_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Services (Servicios)
$queries['services'] = "CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    client_site_id INT DEFAULT NULL,
    technician_id INT DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    service_date DATE,
    service_time TIME,
    service_type VARCHAR(255),
    pests VARCHAR(255),
    notes TEXT,
    price DECIMAL(10, 2),
    reinforcement_days INT DEFAULT NULL,
    rating INT DEFAULT NULL COMMENT '1-5 Stars',
    rating_comment TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id),
    INDEX (client_site_id),
    INDEX (technician_id),
    INDEX (service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Products (Productos - Inventario General)
$queries['products'] = "CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    type VARCHAR(100),
    stock FLOAT DEFAULT 0,
    primary_use VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Service Products (Productos usados en servicios)
$queries['service_products'] = "CREATE TABLE IF NOT EXISTS service_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_used FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (service_id),
    INDEX (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// --- 2. FINANZAS Y DOCUMENTOS ---

// Quotes (Cotizaciones)
$queries['quotes'] = "CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    issue_date DATE,
    due_date DATE,
    items JSON,
    subtotal DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    total DECIMAL(10, 2),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Invoices (Facturas)
$queries['invoices'] = "CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    quote_id INT DEFAULT NULL,
    issue_date DATE,
    client_rfc VARCHAR(20),
    cfdi_use VARCHAR(100),
    tax_regime VARCHAR(100),
    payment_method VARCHAR(100),
    payment_form VARCHAR(100),
    issuer_rfc VARCHAR(20),
    expedition_place VARCHAR(200),
    currency VARCHAR(10) DEFAULT 'MXN',
    exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
    items JSON,
    subtotal DECIMAL(10, 2),
    tax DECIMAL(10, 2),
    total DECIMAL(10, 2),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Expenses (Gastos)
$queries['expenses'] = "CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    date DATE,
    description TEXT,
    amount DECIMAL(10, 2),
    category VARCHAR(100),
    technician_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Payment Notes (Notas de Pago)
$queries['payment_notes'] = "CREATE TABLE IF NOT EXISTS payment_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    service_id INT DEFAULT NULL,
    note_date DATE,
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    reference VARCHAR(100),
    status VARCHAR(50),
    notes TEXT,
    subtotal DECIMAL(10, 2),
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id),
    INDEX (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Reminders (Recordatorios)
$queries['reminders'] = "CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    date DATE,
    text TEXT,
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// --- 3. MÓDULOS ESPECIALIZADOS ---

// Chemicals (Químicos - Inventario Avanzado)
$queries['chemicals'] = "CREATE TABLE IF NOT EXISTS chemicals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    concentration VARCHAR(100),
    quantity_bought_ml FLOAT DEFAULT 0,
    price_total DECIMAL(10, 2) DEFAULT 0,
    current_stock_ml FLOAT DEFAULT 0,
    min_stock_ml FLOAT DEFAULT 0,
    cost_per_ml DECIMAL(10, 4) DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Chemical Usage (Uso de Químicos)
$queries['chemical_usage'] = "CREATE TABLE IF NOT EXISTS chemical_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    chemical_id INT NOT NULL,
    quantity_used FLOAT NOT NULL,
    unit_used VARCHAR(20) DEFAULT 'ml',
    ml_used FLOAT NOT NULL,
    cost_at_time DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (service_id),
    INDEX (chemical_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Inventory History (Historial de Químicos)
$queries['inventory_history'] = "CREATE TABLE IF NOT EXISTS inventory_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    chemical_id INT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    quantity_change FLOAT NOT NULL,
    previous_stock FLOAT DEFAULT 0,
    new_stock FLOAT DEFAULT 0,
    reference_id INT DEFAULT NULL,
    notes TEXT,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (chemical_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Chemical Documents (Documentos de Químicos)
$queries['chemical_documents'] = "CREATE TABLE IF NOT EXISTS chemical_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    chemical_id INT NOT NULL,
    type ENUM('datasheet', 'method') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (chemical_id),
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Cebaderos
$queries['cebaderos'] = "CREATE TABLE IF NOT EXISTS cebaderos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL,
    bait_product VARCHAR(255),
    active_ingredient VARCHAR(255),
    cofepris_registry VARCHAR(100),
    bait_expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    last_inspection DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id),
    UNIQUE KEY unique_code_company (company_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Cebadero Inspections
$queries['cebadero_inspections'] = "CREATE TABLE IF NOT EXISTS cebadero_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cebadero_id INT NOT NULL,
    inspection_date DATETIME NOT NULL,
    tech_id INT NOT NULL,
    condition_status VARCHAR(50) NOT NULL,
    activity_level VARCHAR(50) NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    amount_replenished VARCHAR(50),
    evidence_photo_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (cebadero_id),
    INDEX (tech_id),
    FOREIGN KEY (cebadero_id) REFERENCES cebaderos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// EPP Tables
$queries['epp_deliveries'] = "CREATE TABLE IF NOT EXISTS epp_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    technician_id INT NOT NULL,
    delivery_date DATE NOT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    equipment_status VARCHAR(50) NOT NULL,
    expiration_date DATE DEFAULT NULL,
    signature_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$queries['epp_catalog'] = "CREATE TABLE IF NOT EXISTS epp_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    size VARCHAR(50) DEFAULT NULL,
    certification VARCHAR(100) DEFAULT NULL,
    supplier VARCHAR(150) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$queries['epp_maintenance'] = "CREATE TABLE IF NOT EXISTS epp_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    epp_delivery_id INT NOT NULL,
    maintenance_date DATE NOT NULL,
    type VARCHAR(100) NOT NULL,
    performed_by VARCHAR(150) DEFAULT NULL,
    notes TEXT,
    evidence_path VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (epp_delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$queries['epp_training'] = "CREATE TABLE IF NOT EXISTS epp_training (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    technician_id INT NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    provider VARCHAR(150) DEFAULT NULL,
    training_date DATE NOT NULL,
    valid_until DATE DEFAULT NULL,
    certificate_path VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$queries['epp_service_usage'] = "CREATE TABLE IF NOT EXISTS epp_service_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    service_id INT NOT NULL,
    technician_id INT NOT NULL,
    epp_delivery_id INT DEFAULT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    used_quantity INT NOT NULL,
    notes TEXT,
    evidence_path VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (service_id),
    INDEX (technician_id),
    INDEX (epp_delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$queries['epp_documents'] = "CREATE TABLE IF NOT EXISTS epp_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    epp_delivery_id INT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (epp_delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Chat
$queries['chat_messages'] = "CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    technician_id INT NOT NULL,
    direction ENUM('to_company', 'to_tech') NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_tech (company_id, technician_id),
    INDEX idx_unread (company_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// System Maintenance (Features)
$queries['system_maintenance'] = "CREATE TABLE IF NOT EXISTS system_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Audit Log
$queries['audit_log'] = "CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (user_id),
    INDEX (module),
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// --- EJECUCIÓN ---

foreach ($queries as $name => $sql) {
    echo "<h3>Creando tabla: $name</h3>";
    if ($conn->query($sql) === TRUE) {
        echo "<p style='color:green'>OK</p>";
    } else {
        echo "<p style='color:red'>Error: " . $conn->error . "</p>";
    }
}

// --- SEED INITIAL DATA (Datos Iniciales) ---

// Features
$features = [
    ['feature_key' => 'techs_epp', 'module' => 'techs', 'description' => 'Botón de EPP en Módulo de Técnicos'],
    ['feature_key' => 'techs_add', 'module' => 'techs', 'description' => 'Agregar Nuevo Técnico'],
    ['feature_key' => 'clients_add', 'module' => 'clients', 'description' => 'Agregar Nuevo Cliente'],
    ['feature_key' => 'services_add', 'module' => 'services', 'description' => 'Agendar Nuevo Servicio'],
    ['feature_key' => 'reports_generate', 'module' => 'reports', 'description' => 'Generar Reportes PDF'],
    ['feature_key' => 'inventory_edit', 'module' => 'inventory', 'description' => 'Editar Inventario'],
    ['feature_key' => 'calendar_view', 'module' => 'calendar', 'description' => 'Ver Calendario'],
    ['feature_key' => 'quotes_create', 'module' => 'quotes', 'description' => 'Crear Cotización']
];

$stmt = $conn->prepare("INSERT IGNORE INTO system_maintenance (feature_key, module, description, is_active) VALUES (?, ?, ?, 1)");
if ($stmt) {
    foreach ($features as $f) {
        $stmt->bind_param("sss", $f['feature_key'], $f['module'], $f['description']);
        $stmt->execute();
    }
    $stmt->close();
    echo "<p style='color:green'>Features iniciales insertados.</p>";
}

echo "<h2>Proceso Finalizado</h2>";
$conn->close();
?>