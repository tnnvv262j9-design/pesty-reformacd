<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Get JSON input
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit();
}

$company_id = isset($data['company_id']) ? intval($data['company_id']) : 0;
$user_type = isset($data['user_type']) ? $data['user_type'] : '';
$sender_id = isset($data['requesting_user_id']) ? intval($data['requesting_user_id']) : 0; // The logged in user
$message = isset($data['message']) ? trim($data['message']) : '';

if ($company_id === 0 || empty($message) || empty($user_type)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$technician_id = 0;
$direction = '';

if ($user_type === 'tech') {
    $technician_id = $sender_id; // Tech is sending to company
    $direction = 'to_company';
} else {
    // Admin sending to tech
    if (!isset($data['technician_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Technician ID required for company messages']);
        exit();
    }
    $technician_id = intval($data['technician_id']);
    $direction = 'to_tech';
}

$stmt = $conn->prepare("INSERT INTO chat_messages (company_id, technician_id, direction, message) VALUES (?, ?, ?, ?)");
$stmt->bind_param("iiss", $company_id, $technician_id, $direction, $message);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Message sent']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>
