<?php
include 'db_connect.php';

// Check if photo column exists
$result = $conn->query("SHOW COLUMNS FROM technicians LIKE 'photo'");
if ($result->num_rows == 0) {
    // Add photo column
    $sql = "ALTER TABLE technicians ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER name";
    if ($conn->query($sql) === TRUE) {
        echo "Column 'photo' added successfully to 'technicians' table.";
    } else {
        echo "Error adding column: " . $conn->error;
    }
} else {
    echo "Column 'photo' already exists.";
}

$conn->close();
?>
