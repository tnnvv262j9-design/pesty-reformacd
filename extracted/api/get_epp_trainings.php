<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
if ($company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de empresa requerido']);
    exit;
}

$sql = "SELECT * FROM epp_training WHERE company_id = ? ORDER BY training_date DESC";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta']);
    exit;
}
$stmt->bind_param("i", $company_id);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) $rows[] = $row;
echo json_encode(['success' => true, 'trainings' => $rows]);
$stmt->close();
$conn->close();
?>
