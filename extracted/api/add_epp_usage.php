<?php
header('Content-Type: application/json');
include 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

if (!isset($input['company_id'], $input['service_id'], $input['technician_id'], $input['equipment_type'], $input['used_quantity'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan campos requeridos']);
    exit;
}

$company_id = intval($input['company_id']);
$service_id = intval($input['service_id']);
$technician_id = intval($input['technician_id']);
$epp_delivery_id = isset($input['epp_delivery_id']) ? intval($input['epp_delivery_id']) : null;
$equipment_type = $conn->real_escape_string($input['equipment_type']);
$used_quantity = intval($input['used_quantity']);
$notes = isset($input['notes']) ? $conn->real_escape_string($input['notes']) : null;
$evidence_data = isset($input['evidence']) ? $input['evidence'] : '';
$evidence_path = null;

if (!empty($evidence_data)) {
    if (strpos($evidence_data, 'data:image') === 0) {
        $parts = explode(',', $evidence_data);
        $content = base64_decode($parts[1]);
        $dir = '../uploads/epp/';
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = 'epp_use_' . uniqid() . '.png';
        $path = $dir . $name;
        if (file_put_contents($path, $content)) {
            $evidence_path = 'uploads/epp/' . $name;
        }
    } else {
        $evidence_path = $evidence_data;
    }
}

$stmt = $conn->prepare("INSERT INTO epp_service_usage (company_id, service_id, technician_id, epp_delivery_id, equipment_type, used_quantity, notes, evidence_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando inserción']);
    exit;
}
$stmt->bind_param("iiiisiss", $company_id, $service_id, $technician_id, $epp_delivery_id, $equipment_type, $used_quantity, $notes, $evidence_path);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al insertar']);
}
$stmt->close();
$conn->close();
?>
