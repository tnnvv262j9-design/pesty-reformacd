<?php
header('Content-Type: application/json');
include 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

if (!isset($input['company_id'], $input['technician_id'], $input['course_name'], $input['training_date'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan campos requeridos']);
    exit;
}

$company_id = intval($input['company_id']);
$technician_id = intval($input['technician_id']);
$course_name = $conn->real_escape_string($input['course_name']);
$provider = isset($input['provider']) ? $conn->real_escape_string($input['provider']) : null;
$training_date = $input['training_date'];
$valid_until = isset($input['valid_until']) && $input['valid_until'] !== '' ? $input['valid_until'] : null;
$certificate_path = isset($input['certificate_path']) ? $conn->real_escape_string($input['certificate_path']) : null;

$stmt = $conn->prepare("INSERT INTO epp_training (company_id, technician_id, course_name, provider, training_date, valid_until, certificate_path) VALUES (?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando inserción']);
    exit;
}
$stmt->bind_param("iisssss", $company_id, $technician_id, $course_name, $provider, $training_date, $valid_until, $certificate_path);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al insertar']);
}
$stmt->close();
$conn->close();
?>
