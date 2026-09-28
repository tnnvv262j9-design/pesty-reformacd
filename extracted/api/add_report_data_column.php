<?php
// Script para agregar la columna report_data a la tabla services
include 'db_connect.php';

try {
    // Verificar si la columna ya existe
    $check_sql = "SHOW COLUMNS FROM services LIKE 'report_data'";
    $result = $conn->query($check_sql);
    
    if ($result->num_rows == 0) {
        // La columna no existe, agregarla
        $alter_sql = "ALTER TABLE services ADD COLUMN report_data LONGTEXT NULL";
        
        if ($conn->query($alter_sql) === TRUE) {
            echo json_encode(['success' => true, 'message' => 'Columna report_data agregada exitosamente a la tabla services.']);
        } else {
            throw new Exception('Error al agregar la columna: ' . $conn->error);
        }
    } else {
        echo json_encode(['success' => true, 'message' => 'La columna report_data ya existe en la tabla services.']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>