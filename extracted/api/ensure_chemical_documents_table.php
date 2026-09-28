<?php
require_once 'db_connect.php';

// Create chemical_documents table
$sql = "CREATE TABLE IF NOT EXISTS chemical_documents (
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

if ($conn->query($sql) === TRUE) {
    // Table ensured
} else {
    error_log("Error creating table: " . $conn->error);
}

$conn->close();
?>