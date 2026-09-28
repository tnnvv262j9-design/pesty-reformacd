<?php
include 'db_connect.php';

// Add common_pests column to companies table if it doesn't exist
$sql = "SHOW COLUMNS FROM companies LIKE 'common_pests'";
$result = $conn->query($sql);

if ($result->num_rows == 0) {
    $alter = "ALTER TABLE companies ADD COLUMN common_pests TEXT DEFAULT NULL AFTER treatment_methods";
    if ($conn->query($alter) === TRUE) {
        echo "Column common_pests added successfully to companies table.<br>";
    } else {
        echo "Error adding column: " . $conn->error . "<br>";
    }
} else {
    echo "Column common_pests already exists.<br>";
}

$conn->close();
?>
