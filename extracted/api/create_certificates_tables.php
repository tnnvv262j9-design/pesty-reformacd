<?php
include 'db_connect.php';

header('Content-Type: application/json');

$queries = [];

// Table for Certificate Templates
$queries['certificate_templates'] = "CREATE TABLE IF NOT EXISTS certificate_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    field_mapping TEXT, -- JSON to store coordinates of fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Table for Generated Certificates
$queries['generated_certificates'] = "CREATE TABLE IF NOT EXISTS generated_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    service_id INT NOT NULL,
    template_id INT NOT NULL,
    folio VARCHAR(100) NOT NULL,
    validity_months INT DEFAULT 1,
    file_path VARCHAR(255) NOT NULL,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (service_id),
    INDEX (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$results = [];
foreach ($queries as $name => $sql) {
    if ($conn->query($sql) === TRUE) {
        $results[$name] = "OK";
    } else {
        $results[$name] = "Error: " . $conn->error;
    }
}

echo json_encode(['success' => true, 'results' => $results]);
?>
