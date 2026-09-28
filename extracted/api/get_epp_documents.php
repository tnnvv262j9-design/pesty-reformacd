<?php
header('Content-Type: application/json');
include 'db_connect.php';

$epp_delivery_id = isset($_GET['epp_delivery_id']) ? intval($_GET['epp_delivery_id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($epp_delivery_id <= 0 && $company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parámetros inválidos']);
    exit;
}

if ($epp_delivery_id > 0) {
    $stmt = $conn->prepare("SELECT id, company_id, epp_delivery_id, doc_type, file_path, created_at FROM epp_documents WHERE epp_delivery_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $epp_delivery_id);
} else {
    $stmt = $conn->prepare("SELECT id, company_id, epp_delivery_id, doc_type, file_path, created_at FROM epp_documents WHERE company_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $company_id);
}

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}

$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) $rows[] = $row;
echo json_encode(['success' => true, 'documents' => $rows]);
$stmt->close();
$conn->close();
?> 
