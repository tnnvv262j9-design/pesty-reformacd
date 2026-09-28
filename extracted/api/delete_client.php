<?php
include 'db_connect.php';
require_once 'audit_log_helper.php';

if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se proporcionó un ID de cliente.']);
    exit();
}

$id = intval($_GET['id']);

// Nota: Se recomienda tener una clave foránea con ON DELETE CASCADE 
// en la tabla 'services' (en la columna client_id) para que al borrar
// un cliente, se borren automáticamente todos sus servicios asociados.
// Si no, deberías borrarlos manualmente aquí antes de borrar el cliente.

$stmt = $conn->prepare("DELETE FROM clients WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        $company_id = $_GET['company_id'] ?? ($_SESSION['company_id'] ?? null);
        $requesting_user_id = $_GET['requesting_user_id'] ?? ($_SESSION['user_id'] ?? null);
        if ($company_id) {
            log_audit_event($conn, $company_id, $requesting_user_id, 'clientes', 'delete', 'client', $id, "Se eliminó al cliente ID: $id");
        }
        echo json_encode(['success' => true, 'message' => 'Cliente eliminado.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se encontró ningún cliente con ese ID.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
