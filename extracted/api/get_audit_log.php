<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'audit_log_helper.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
if ($limit <= 0 || $limit > 200) {
    $limit = 20;
}

if ($company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de compañía inválido']);
    exit();
}

ensure_audit_log_table($conn);

$stmt = $conn->prepare("SELECT id, company_id, user_id, module, action, entity_type, entity_id, description, created_at FROM audit_log WHERE company_id = ? ORDER BY created_at DESC LIMIT ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit();
}

$stmt->bind_param("ii", $company_id, $limit);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'items' => $rows]);
?>
