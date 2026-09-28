<?php
header('Content-Type: application/json');
include 'db_connect.php';
require_once 'audit_log_helper.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Falta el ID']);
    exit();
}

$id = intval($data->id);

$sql = "DELETE FROM chemicals WHERE id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta (delete chemical): ' . $conn->error]);
    exit();
}
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    $company_id = $data->company_id ?? ($_SESSION['company_id'] ?? null);
    $requesting_user_id = $data->requesting_user_id ?? ($_SESSION['user_id'] ?? null);
    if ($company_id) {
        log_audit_event($conn, $company_id, $requesting_user_id, 'inventario', 'delete', 'chemical', $id, "Se eliminó el producto químico ID: $id");
    }
    echo json_encode(['success' => true, 'message' => 'Químico eliminado exitosamente']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
