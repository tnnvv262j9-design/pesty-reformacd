<?php
header('Content-Type: application/json');
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($company_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de compañía inválido']);
    exit();
}

$sql = "SELECT * FROM chemicals WHERE company_id = ? ORDER BY name ASC";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta (get chemicals): ' . $conn->error]);
    exit();
}
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();

$chemicals = [];
while ($row = $result->fetch_assoc()) {
    // Determine status based on stock
    $stock_status = 'OK';
    if ($row['current_stock_ml'] <= $row['min_stock_ml']) {
        $stock_status = 'Bajo';
    }
    if ($row['current_stock_ml'] <= 0) {
        $stock_status = 'Agotado';
    }
    $row['stock_status'] = $stock_status;
    $chemicals[] = $row;
}

echo json_encode(['success' => true, 'chemicals' => $chemicals]);

$stmt->close();
$conn->close();
?>
