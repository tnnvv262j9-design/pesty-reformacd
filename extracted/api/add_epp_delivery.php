<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Decode JSON input if content type is JSON, otherwise use $_POST
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

// Validate required fields
if (!isset($input['company_id']) || !isset($input['technician_id']) || !isset($input['equipment_type']) || !isset($input['quantity']) || !isset($input['reason']) || !isset($input['equipment_status'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit;
}

$company_id = intval($input['company_id']);
$technician_id = intval($input['technician_id']);
$delivery_date = isset($input['delivery_date']) ? $input['delivery_date'] : date('Y-m-d');
$equipment_type = $conn->real_escape_string($input['equipment_type']);
$quantity = intval($input['quantity']);
$reason = $conn->real_escape_string($input['reason']);
$equipment_status = $conn->real_escape_string($input['equipment_status']);
$expiration_date = !empty($input['expiration_date']) ? $input['expiration_date'] : NULL;
$signature_data = isset($input['signature']) ? $input['signature'] : '';

// Handle signature upload
$signature_path = '';
if (!empty($signature_data)) {
    // If it's a base64 string
    if (strpos($signature_data, 'data:image') === 0) {
        $data = explode(',', $signature_data);
        $content = base64_decode($data[1]);
        $file_name = 'epp_sig_' . uniqid() . '.png';
        $upload_dir = '../uploads/signatures/';
        
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        $file_path = $upload_dir . $file_name;
        if (file_put_contents($file_path, $content)) {
            $signature_path = 'uploads/signatures/' . $file_name;
        }
    } else {
        // Assume it's already a path or empty
        $signature_path = $signature_data;
    }
}

// Insert into database
$sql = "INSERT INTO epp_deliveries (company_id, technician_id, delivery_date, equipment_type, quantity, reason, equipment_status, expiration_date, signature_path) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iisssssss", $company_id, $technician_id, $delivery_date, $equipment_type, $quantity, $reason, $equipment_status, $expiration_date, $signature_path);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Entrega de EPP registrada correctamente', 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar en base de datos: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>