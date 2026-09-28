<?php
include 'db_connect.php';

$sql = "CREATE TABLE IF NOT EXISTS client_sites (
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

if ($conn->query($sql) === TRUE) {
    echo "Table client_sites created or already exists.\n";
} else {
    echo "Error creating client_sites table: " . $conn->error . "\n";
}

$conn->close();
?>
