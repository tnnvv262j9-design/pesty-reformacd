<?php
include 'db_connect.php';

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Falta el ID de la empresa.']);
    exit();
}

$sql = "SELECT * FROM recurring_expenses WHERE company_id = ? ORDER BY day_of_month ASC";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();

$expenses = [];
while ($row = $result->fetch_assoc()) {
    $expenses[] = $row;
}

echo json_encode($expenses);

$stmt->close();
$conn->close();
?>
