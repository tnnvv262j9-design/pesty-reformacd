<?php
header('Content-Type: application/json');
include 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit();
}

$company_id = isset($data['company_id']) ? intval($data['company_id']) : 0;
$technician_id = isset($data['technician_id']) ? intval($data['technician_id']) : 0;
$user_type = isset($data['user_type']) ? $data['user_type'] : '';

if ($company_id === 0 || $technician_id === 0 || empty($user_type)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

// If company is reading, mark 'to_company' messages as read
// If tech is reading, mark 'to_tech' messages as read
$direction_to_mark = ($user_type === 'company') ? 'to_company' : 'to_tech';

$stmt = $conn->prepare("UPDATE chat_messages SET is_read = 1 WHERE company_id = ? AND technician_id = ? AND direction = ? AND is_read = 0");
$stmt->bind_param("iis", $company_id, $technician_id, $direction_to_mark);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'marked' => $stmt->affected_rows]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}

$stmt->close();
$conn->close();
?>
