<?php
include 'db_connect.php';

// Create chat_messages table
$sql = "CREATE TABLE IF NOT EXISTS chat_messages (
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

if ($conn->query($sql) === TRUE) {
    echo "Table 'chat_messages' created successfully or already exists.<br>";
} else {
    echo "Error creating table: " . $conn->error . "<br>";
}

// Check if we need to add columns (in case table existed but was different - unlikely for new feature but good practice)
// Skipping for now as it's a new table.

echo "Database setup completed.";
?>
