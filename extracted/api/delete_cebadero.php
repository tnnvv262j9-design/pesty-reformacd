<?php
include 'db_connect.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($id === 0 || $company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID inválido.']);
    exit();
}

// Verificar propiedad antes de borrar
$check = $conn->prepare("SELECT id FROM cebaderos WHERE id = ? AND company_id = ?");
$check->bind_param("ii", $id, $company_id);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado.']);
    exit();
}
$check->close();

// Eliminar (Las inspecciones se borran en cascada por la FK)
$stmt = $conn->prepare("DELETE FROM cebaderos WHERE id = ? AND company_id = ?");
$stmt->bind_param("ii", $id, $company_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cebadero eliminado.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>