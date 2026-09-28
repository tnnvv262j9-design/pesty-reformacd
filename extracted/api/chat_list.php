<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID required']);
    exit();
}

// Get all technicians and their chat stats
// Using LEFT JOIN to get all techs even if no chat history
// Subqueries for last message and unread count
$sql = "
    SELECT 
        t.id, t.name, t.phone,
        (SELECT message FROM chat_messages WHERE company_id = t.company_id AND technician_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE company_id = t.company_id AND technician_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM chat_messages WHERE company_id = t.company_id AND technician_id = t.id AND direction = 'to_company' AND is_read = 0) as unread_count
    FROM technicians t
    WHERE t.company_id = ?
    ORDER BY last_message_time DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();

$chats = [];
while ($row = $result->fetch_assoc()) {
    $chats[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'chats' => $chats]);
?>
