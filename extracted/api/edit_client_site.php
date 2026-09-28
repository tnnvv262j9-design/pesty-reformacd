<?php
header('Content-Type: application/json');
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de sitio no proporcionado']);
    exit;
}

$id = intval($data->id);
$name = isset($data->name) ? trim($data->name) : '';
$code = isset($data->code) ? trim($data->code) : null;
$address = isset($data->address) ? trim($data->address) : null;
$notes = isset($data->notes) ? trim($data->notes) : null;
$risk_level = isset($data->risk_level) ? trim($data->risk_level) : null;

$stmt = $conn->prepare("UPDATE client_sites SET name = ?, code = ?, address = ?, notes = ?, risk_level = ? WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}

$stmt->bind_param("sssssi", $name, $code, $address, $notes, $risk_level, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
