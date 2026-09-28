<?php
include 'db_connect.php';

// Add limit_chemicals column to companies table
$check_col = $conn->query("SHOW COLUMNS FROM companies LIKE 'limit_chemicals'");
if ($check_col && $check_col->num_rows == 0) {
    $conn->query("ALTER TABLE companies ADD COLUMN limit_chemicals INT DEFAULT 0"); // Default 0 means disabled/none, or maybe small number?
    echo "Added limit_chemicals to companies.<br>";
} else {
    echo "Column limit_chemicals already exists.<br>";
}

$conn->close();
?>