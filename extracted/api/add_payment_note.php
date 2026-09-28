<?php
include 'db_connect.php';
require_once 'check_limits.php'; // <-- Importar validador

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->client_id, $data->note_date, $data->amount, $data->payment_method)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para crear la nota de pago.']);
    exit();
}

// --- Verificar Límite de Notas de Pago ---
$limitCheck = checkLimit($conn, $data->company_id, 'payment_note');
if (!$limitCheck['allowed']) {
    echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
    exit();
}
// ----------------------------------------

$sql = "INSERT INTO payment_notes (company_id, client_id, service_id, note_date, amount, payment_method, reference, status, notes, subtotal, tax_rate, tax_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

$service_id = !empty($data->service_id) ? $data->service_id : null;
$reference = $data->reference ?? null;
$notes = $data->notes ?? null;
$status = $data->status ?? 'Pagada';
$subtotal = $data->subtotal ?? $data->amount;
$tax_rate = $data->tax_rate ?? 0;
$tax_amount = $data->tax_amount ?? 0;

$stmt->bind_param(
    'iiisdssssddd',
    $data->company_id,
    $data->client_id,
    $service_id,
    $data->note_date,
    $data->amount,
    $data->payment_method,
    $reference,
    $status,
    $notes,
    $subtotal,
    $tax_rate,
    $tax_amount
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Nota de pago creada exitosamente.', 'note_id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear la nota de pago: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>