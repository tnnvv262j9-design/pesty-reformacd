<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$service_id = isset($_GET['service_id']) ? intval($_GET['service_id']) : 0;
$technician_id = isset($_GET['technician_id']) ? intval($_GET['technician_id']) : 0;

if ($company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de empresa requerido']);
    exit;
}

$sql = "SELECT u.*, s.service_date, s.client_id FROM epp_service_usage u JOIN services s ON u.service_id = s.id WHERE u.company_id = ?";
$types = "i";
$params = [$company_id];

if ($service_id > 0) {
    $sql .= " AND u.service_id = ?";
    $types .= "i";
    $params[] = $service_id;
}
if ($technician_id > 0) {
    $sql .= " AND u.technician_id = ?";
    $types .= "i";
    $params[] = $technician_id;
}
$sql .= " ORDER BY u.created_at DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) $rows[] = $row;
echo json_encode(['success' => true, 'usage' => $rows]);
$stmt->close();
$conn->close();
?>
