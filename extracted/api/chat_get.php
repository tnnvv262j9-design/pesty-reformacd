<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$user_type = isset($_GET['user_type']) ? $_GET['user_type'] : '';
$requesting_user_id = isset($_GET['requesting_user_id']) ? intval($_GET['requesting_user_id']) : 0;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

if ($company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID required']);
    exit();
}

$technician_id = 0;

if ($user_type === 'tech') {
    $technician_id = $requesting_user_id;
} else {
    // Admin viewing a tech's chat
    if (!isset($_GET['technician_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Technician ID required']);
        exit();
    }
    $technician_id = intval($_GET['technician_id']);
}

$stmt = $conn->prepare("
    SELECT id, direction, message, is_read, created_at 
    FROM chat_messages 
    WHERE company_id = ? AND technician_id = ? 
    ORDER BY created_at ASC 
    LIMIT ?
");
$stmt->bind_param("iii", $company_id, $technician_id, $limit);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'messages' => $messages]);
?>
