<?php
header('Content-Type: application/json');
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->company_id) || !isset($data->client_id) || !isset($data->name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit;
}

$company_id = intval($data->company_id);
$client_id = intval($data->client_id);
$name = trim($data->name);
$code = isset($data->code) ? trim($data->code) : null;
$address = isset($data->address) ? trim($data->address) : null;
$notes = isset($data->notes) ? trim($data->notes) : null;
$risk_level = isset($data->risk_level) ? trim($data->risk_level) : null;

$stmt = $conn->prepare("INSERT INTO client_sites (company_id, client_id, name, code, address, notes, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}

$stmt->bind_param("iisssss", $company_id, $client_id, $name, $code, $address, $notes, $risk_level);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
