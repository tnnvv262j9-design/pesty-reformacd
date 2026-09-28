<?php
include 'db_connect.php';

// Array de sentencias SQL para actualizar la base de datos
$sql_statements = [
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL",
    "ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL",
    "ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL"
];

echo "Iniciando actualización de base de datos para módulo de Rutas...<br>";

foreach ($sql_statements as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Ejecutado correctamente: $sql <br>";
    } else {
        echo "Error al ejecutar: $sql - " . $conn->error . "<br>";
    }
}

echo "Actualización completada.";
$conn->close();
?>
