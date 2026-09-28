<?php
include 'db_connect.php';

// Check if column exists
$check_sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'services' AND COLUMN_NAME = 'reinforcement_days'";
$result = $conn->query($check_sql);

if ($result->num_rows > 0) {
    echo json_encode(['success' => true, 'message' => 'La columna reinforcement_days ya existe.']);
    exit();
}

$alter_sql = "ALTER TABLE services ADD COLUMN reinforcement_days INT DEFAULT NULL";

if ($conn->query($alter_sql) === TRUE) {
    echo json_encode(['success' => true, 'message' => 'Columna reinforcement_days agregada exitosamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la tabla: ' . $conn->error]);
}

$conn->close();
?>