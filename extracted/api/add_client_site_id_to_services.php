<?php
include 'db_connect.php';

header('Content-Type: application/json');

try {
    $check = $conn->query("SHOW COLUMNS FROM services LIKE 'client_site_id'");
    if (!$check) {
        throw new Exception('Error verificando columna: ' . $conn->error);
    }

    if ($check->num_rows === 0) {
        $alterSql = "ALTER TABLE services 
            ADD COLUMN client_site_id INT NULL AFTER client_id,
            ADD INDEX idx_client_site_id (client_site_id)";

        if (!$conn->query($alterSql)) {
            throw new Exception('Error agregando columna client_site_id: ' . $conn->error);
        }

        echo json_encode(['success' => true, 'message' => 'Columna client_site_id agregada a services.']);
    } else {
        echo json_encode(['success' => true, 'message' => 'La columna client_site_id ya existe en services.']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>

