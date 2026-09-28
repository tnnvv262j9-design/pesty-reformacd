<?php
include 'db_connect.php';

// Add start_date column
$sql1 = "ALTER TABLE technicians ADD COLUMN start_date DATE NULL";
if ($conn->query($sql1) === TRUE) {
    echo "Column start_date created successfully\n";
} else {
    echo "Error creating column start_date: " . $conn->error . "\n";
}

// Add base_salary column
$sql2 = "ALTER TABLE technicians ADD COLUMN base_salary DECIMAL(10,2) DEFAULT 0.00";
if ($conn->query($sql2) === TRUE) {
    echo "Column base_salary created successfully\n";
} else {
    echo "Error creating column base_salary: " . $conn->error . "\n";
}

// Add photo column
$sql3 = "ALTER TABLE technicians ADD COLUMN photo VARCHAR(255) DEFAULT NULL";
if ($conn->query($sql3) === TRUE) {
    echo "Column photo created successfully\n";
} else {
    echo "Error creating column photo: " . $conn->error . "\n";
}

$conn->close();
?>
