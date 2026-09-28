<?php
include 'db_connect.php';

header('Content-Type: text/plain');

// Add type column to clients
$sql = "ALTER TABLE clients ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT NULL";
if ($conn->query($sql) === TRUE) {
    echo "Added 'type' column to clients table.\n";
} else {
    echo "Error adding 'type' column: " . $conn->error . "\n";
}

$conn->close();
?>
