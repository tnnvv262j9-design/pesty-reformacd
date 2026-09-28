<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    echo json_encode(['success' => false, 'message' => 'Falta company_id.']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM certificate_templates WHERE company_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();
$templates = [];

while ($row = $result->fetch_assoc()) {
    $templates[] = $row;
}

echo json_encode(['success' => true, 'templates' => $templates]);
?>
