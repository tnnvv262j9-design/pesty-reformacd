<?php
// Silently check and add columns to chemicals table
if (!isset($conn)) return;

$columns_to_check = [
    'type' => "VARCHAR(50) DEFAULT 'liquid'",
    'measurement_unit' => "VARCHAR(20) DEFAULT 'ml'",
    'rsco' => "VARCHAR(255) DEFAULT NULL",
    'active_ingredient' => "VARCHAR(255) DEFAULT NULL",
    'batch_number' => "VARCHAR(255) DEFAULT NULL",
    'expiration_date' => "DATE DEFAULT NULL"
];

foreach ($columns_to_check as $col => $def) {
    $check = $conn->query("SHOW COLUMNS FROM chemicals LIKE '$col'");
    if ($check && $check->num_rows == 0) {
        $conn->query("ALTER TABLE chemicals ADD COLUMN $col $def");
    }
}
?>
