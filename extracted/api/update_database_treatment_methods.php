<?php
include 'db_connect.php';

// Add treatment_methods column to companies table
$sql = "SHOW COLUMNS FROM companies LIKE 'treatment_methods'";
$result = $conn->query($sql);

if ($result->num_rows == 0) {
    $sql = "ALTER TABLE companies ADD COLUMN treatment_methods TEXT DEFAULT NULL";
    if ($conn->query($sql) === TRUE) {
        echo "Column treatment_methods added successfully";
    } else {
        echo "Error adding column: " . $conn->error;
    }
} else {
    echo "Column treatment_methods already exists";
}

$conn->close();
?>
