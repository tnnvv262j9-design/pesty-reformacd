<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
if ($company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de empresa requerido']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM epp_catalog WHERE company_id = ? ORDER BY created_at DESC");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}
$stmt->bind_param("i", $company_id);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = $row;
}
echo json_encode(['success' => true, 'items' => $rows]);
$stmt->close();
$conn->close();
?>
