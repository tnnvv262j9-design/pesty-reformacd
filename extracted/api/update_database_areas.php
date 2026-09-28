<?php
include 'db_connect.php';

// Add treated_areas column to companies table if it doesn't exist
$sql = "SHOW COLUMNS FROM companies LIKE 'treated_areas'";
$result = $conn->query($sql);

if ($result->num_rows == 0) {
    $alter = "ALTER TABLE companies ADD COLUMN treated_areas TEXT DEFAULT NULL AFTER common_pests";
    if ($conn->query($alter) === TRUE) {
        echo "Column treated_areas added successfully to companies table.<br>";
    } else {
        echo "Error adding column: " . $conn->error . "<br>";
    }
} else {
    echo "Column treated_areas already exists.<br>";
}

$conn->close();
?>
