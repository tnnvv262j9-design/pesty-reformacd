<?php
include 'db_connect.php';

// Add new columns to quotes table
$columns = [
    "ADD COLUMN service_type VARCHAR(50) DEFAULT 'Residencial'",
    "ADD COLUMN area_size VARCHAR(100) DEFAULT NULL",
    "ADD COLUMN pests VARCHAR(255) DEFAULT NULL",
    "ADD COLUMN frequency VARCHAR(50) DEFAULT 'Único'",
    "ADD COLUMN warranty VARCHAR(50) DEFAULT 'Sin garantía'",
    "ADD COLUMN signature_url LONGTEXT DEFAULT NULL",
    "ADD COLUMN signer_name VARCHAR(150) DEFAULT NULL",
    "ADD COLUMN signer_role VARCHAR(100) DEFAULT NULL",
    "ADD COLUMN vat_rate DECIMAL(4,2) DEFAULT 0.00"
];

foreach ($columns as $col) {
    // Check if column exists first to avoid errors (or just use try/catch or IGNORE logic if syntax allows, but standard MySQL ALTER doesn't have IF NOT EXISTS for columns easily)
    // We'll just run it and catch errors, or check information_schema.
    // For simplicity in this environment, we'll try to add. If it fails, it might exist.
    
    $sql = "ALTER TABLE quotes $col";
    if ($conn->query($sql) === TRUE) {
        echo "Column added: $col<br>";
    } else {
        echo "Error adding column (might already exist): " . $conn->error . "<br>";
    }
}

echo "Schema update completed.";
?>
