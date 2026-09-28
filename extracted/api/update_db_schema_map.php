<?php
include 'api/db_connect.php';

header('Content-Type: text/plain');

// Add map_url to clients
$sql1 = "ALTER TABLE clients ADD COLUMN IF NOT EXISTS map_url VARCHAR(255) DEFAULT NULL";
if ($conn->query($sql1) === TRUE) {
    echo "Added map_url to clients table.\n";
} else {
    echo "Error adding map_url to clients: " . $conn->error . "\n";
}

// Add map_x and map_y to cebaderos
$sql2 = "ALTER TABLE cebaderos ADD COLUMN IF NOT EXISTS map_x DECIMAL(5,2) DEFAULT NULL";
if ($conn->query($sql2) === TRUE) {
    echo "Added map_x to cebaderos table.\n";
} else {
    echo "Error adding map_x to cebaderos: " . $conn->error . "\n";
}

$sql3 = "ALTER TABLE cebaderos ADD COLUMN IF NOT EXISTS map_y DECIMAL(5,2) DEFAULT NULL";
if ($conn->query($sql3) === TRUE) {
    echo "Added map_y to cebaderos table.\n";
} else {
    echo "Error adding map_y to cebaderos: " . $conn->error . "\n";
}

$conn->close();
?>