<?php
header('Content-Type: application/json');
include 'db_connect.php';

if (!isset($_GET['technician_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Falta el ID del técnico']);
    exit;
}

$technician_id = intval($_GET['technician_id']);
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

$sql = "SELECT * FROM epp_deliveries WHERE technician_id = ?";
if ($company_id > 0) {
    $sql .= " AND company_id = ?";
}
$sql .= " ORDER BY delivery_date DESC, created_at DESC";

$stmt = $conn->prepare($sql);

if ($company_id > 0) {
    $stmt->bind_param("ii", $technician_id, $company_id);
} else {
    $stmt->bind_param("i", $technician_id);
}

$stmt->execute();
$result = $stmt->get_result();

$deliveries = [];
while ($row = $result->fetch_assoc()) {
    $deliveries[] = $row;
}

echo json_encode(['success' => true, 'deliveries' => $deliveries]);

$stmt->close();
$conn->close();
?>