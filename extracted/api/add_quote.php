<?php
include 'db_connect.php';
require_once 'check_limits.php'; // <-- Importar validador

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->client_id, $data->issue_date, $data->items, $data->total)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de cotización incompletos.']);
    exit();
}

// --- Verificar Límite de Cotizaciones ---
$limitCheck = checkLimit($conn, $data->company_id, 'quote');
if (!$limitCheck['allowed']) {
    echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
    exit();
}
// ----------------------------------------

$sql = "INSERT INTO quotes (company_id, client_id, issue_date, due_date, items, subtotal, discount, total, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

$items_json = json_encode($data->items);
$stmt->bind_param(
    'iisssddsss',
    $data->company_id,
    $data->client_id,
    $data->issue_date,
    $data->due_date,
    $items_json,
    $data->subtotal,
    $data->discount,
    $data->total,
    $data->status,
    $data->notes
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cotización creada exitosamente.', 'quote_id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear la cotización: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>