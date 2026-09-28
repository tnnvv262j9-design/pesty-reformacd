<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id) || !isset($data->client_id) || !isset($data->code)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
    exit();
}

$company_id = intval($data->company_id);
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
$status = $conn->real_escape_string($data->status ?? 'active');

// Verificar duplicados
$check = $conn->prepare("SELECT id FROM cebaderos WHERE company_id = ? AND code = ?");
$check->bind_param("is", $company_id, $code);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Ya existe un cebadero con este código ID.']);
    exit();
}
$check->close();

$stmt = $conn->prepare("INSERT INTO cebaderos (company_id, client_id, code, area_type, location, device_type, target, bait_product, active_ingredient, cofepris_registry, bait_expiry_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("iissssssssss", $company_id, $client_id, $code, $area_type, $location, $device_type, $target, $bait_product, $active_ingredient, $cofepris_registry, $bait_expiry_date, $status);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cebadero registrado exitosamente.', 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar cebadero: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>