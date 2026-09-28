<?php
include 'db_connect.php';

// Create chemicals table
$sql_chemicals = "CREATE TABLE IF NOT EXISTS chemicals (
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

if ($conn->query($sql_chemicals) === TRUE) {
    echo "Table 'chemicals' created successfully.<br>";
} else {
    echo "Error creating table 'chemicals': " . $conn->error . "<br>";
}

// Create chemical_usage table
$sql_usage = "CREATE TABLE IF NOT EXISTS chemical_usage (
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

if ($conn->query($sql_usage) === TRUE) {
    echo "Table 'chemical_usage' created successfully.<br>";
} else {
    echo "Error creating table 'chemical_usage': " . $conn->error . "<br>";
}

// Create inventory_history table
$sql_history = "CREATE TABLE IF NOT EXISTS inventory_history (
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

if ($conn->query($sql_history) === TRUE) {
    echo "Table 'inventory_history' created successfully.<br>";
} else {
    echo "Error creating table 'inventory_history': " . $conn->error . "<br>";
}

// Add missing columns if table exists (simple migration check)
// This is a rough way to ensure columns exist without full migration system
$check_col = $conn->query("SHOW COLUMNS FROM inventory_history LIKE 'company_id'");
if ($check_col && $check_col->num_rows == 0) {
    $conn->query("ALTER TABLE inventory_history ADD COLUMN company_id INT NOT NULL AFTER id");
    $conn->query("ALTER TABLE inventory_history ADD INDEX (company_id)");
    echo "Added company_id to inventory_history.<br>";
}

$check_col2 = $conn->query("SHOW COLUMNS FROM inventory_history LIKE 'quantity_change'");
if ($check_col2 && $check_col2->num_rows == 0) {
    $conn->query("ALTER TABLE inventory_history CHANGE COLUMN change_amount quantity_change FLOAT NOT NULL");
    echo "Renamed change_amount to quantity_change in inventory_history.<br>";
}

$check_col3 = $conn->query("SHOW COLUMNS FROM inventory_history LIKE 'previous_stock'");
if ($check_col3 && $check_col3->num_rows == 0) {
    $conn->query("ALTER TABLE inventory_history ADD COLUMN previous_stock FLOAT DEFAULT 0 AFTER quantity_change");
    $conn->query("ALTER TABLE inventory_history ADD COLUMN new_stock FLOAT DEFAULT 0 AFTER previous_stock");
    $conn->query("ALTER TABLE inventory_history ADD COLUMN notes TEXT AFTER reference_id");
    $conn->query("ALTER TABLE inventory_history ADD COLUMN created_by INT DEFAULT NULL AFTER notes");
    echo "Added extended columns to inventory_history.<br>";
}

// Add missing columns to chemical_usage if needed
$check_usage_col = $conn->query("SHOW COLUMNS FROM chemical_usage LIKE 'ml_used'");
if ($check_usage_col && $check_usage_col->num_rows == 0) {
    $conn->query("ALTER TABLE chemical_usage ADD COLUMN ml_used FLOAT NOT NULL DEFAULT 0");
    echo "Added ml_used to chemical_usage.<br>";
}

$check_usage_col2 = $conn->query("SHOW COLUMNS FROM chemical_usage LIKE 'quantity_used'");
if ($check_usage_col2 && $check_usage_col2->num_rows == 0) {
    $conn->query("ALTER TABLE chemical_usage ADD COLUMN quantity_used FLOAT NOT NULL DEFAULT 0");
    echo "Added quantity_used to chemical_usage.<br>";
}

$check_usage_col3 = $conn->query("SHOW COLUMNS FROM chemical_usage LIKE 'unit_used'");
if ($check_usage_col3 && $check_usage_col3->num_rows == 0) {
    $conn->query("ALTER TABLE chemical_usage ADD COLUMN unit_used VARCHAR(20) DEFAULT 'ml'");
    echo "Added unit_used to chemical_usage.<br>";
}

$check_usage_col4 = $conn->query("SHOW COLUMNS FROM chemical_usage LIKE 'cost_at_time'");
if ($check_usage_col4 && $check_usage_col4->num_rows == 0) {
    $conn->query("ALTER TABLE chemical_usage ADD COLUMN cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0");
    echo "Added cost_at_time to chemical_usage.<br>";
}

$conn->close();
?>
