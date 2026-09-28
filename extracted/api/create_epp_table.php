<?php
include 'db_connect.php';

// SQL to create epp_deliveries table
$sql1 = "CREATE TABLE IF NOT EXISTS epp_deliveries (
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

// SQL to create epp_catalog table
$sql2 = "CREATE TABLE IF NOT EXISTS epp_catalog (
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

// SQL to create epp_maintenance table
$sql3 = "CREATE TABLE IF NOT EXISTS epp_maintenance (
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

// SQL to create epp_training table
$sql4 = "CREATE TABLE IF NOT EXISTS epp_training (
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

// SQL to create epp_service_usage table
$sql5 = "CREATE TABLE IF NOT EXISTS epp_service_usage (
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

foreach ([$sql1, $sql2, $sql3, $sql4, $sql5] as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Table created/updated successfully.\n";
    } else {
        echo "Error creating table: " . $conn->error . "\n";
    }
}

// SQL to create epp_documents table
$sql6 = "CREATE TABLE IF NOT EXISTS epp_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    epp_delivery_id INT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (epp_delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if ($conn->query($sql6) === TRUE) {
    echo "Table created/updated successfully.\n";
} else {
    echo "Error creating table: " . $conn->error . "\n";
}

$conn->close();
?>
