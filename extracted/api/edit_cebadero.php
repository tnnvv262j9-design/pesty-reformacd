<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Falta ID del cebadero.']);
    exit();
}

$id = intval($data->id);
$company_id = intval($data->company_id);

// Verificar propiedad
$check = $conn->prepare("SELECT id FROM cebaderos WHERE id = ? AND company_id = ?");
$check->bind_param("ii", $id, $company_id);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado o cebadero no encontrado.']);
    exit();
}

$client_id = intval($data->client_id);
$code = $conn->real_escape_string($data->code);
$area_type = $conn->real_escape_string($data->area_type);
$location = $conn->real_escape_string($data->location);
$device_type = $conn->real_escape_string($data->device_type);
$target = $conn->real_escape_string($data->target);
$bait_product = $conn->real_escape_string($data->bait_product ?? '');
$active_ingredient = $conn->real_escape_string($data->active_ingredient ?? '');
$cofepris_registry = $conn->real_escape_string($data->cofepris_registry ?? '');
$bait_expiry_date = !empty($data->bait_expiry_date) ? $conn->real_escape_string($data->bait_expiry_date) : NULL;
$status = $conn->real_escape_string($data->status);

$stmt = $conn->prepare("UPDATE cebaderos SET client_id=?, code=?, area_type=?, location=?, device_type=?, target=?, bait_product=?, active_ingredient=?, cofepris_registry=?, bait_expiry_date=?, status=? WHERE id=? AND company_id=?");
$stmt->bind_param("issssssssssii", $client_id, $code, $area_type, $location, $device_type, $target, $bait_product, $active_ingredient, $cofepris_registry, $bait_expiry_date, $status, $id, $company_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cebadero actualizado correctamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>