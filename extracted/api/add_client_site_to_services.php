<?php
include 'db_connect.php';

header('Content-Type: text/plain');

$check = $conn->query("SHOW COLUMNS FROM services LIKE 'client_site_id'");
if ($check && $check->num_rows === 0) {
    $sql = "ALTER TABLE services 
        ADD COLUMN client_site_id INT NULL AFTER client_id,
        ADD INDEX idx_client_site_id (client_site_id)";

    if ($conn->query($sql) === TRUE) {
        echo "Columna client_site_id agregada a services.\n";
    } else {
        echo "Error al agregar client_site_id: " . $conn->error . "\n";
    }
} else {
    echo "La columna client_site_id ya existe en services.\n";
}

$conn->close();
?>

