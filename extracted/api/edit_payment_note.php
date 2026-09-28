<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->client_id, $data->note_date, $data->amount, $data->payment_method)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para editar la nota de pago.']);
    exit();
}

$sql = "UPDATE payment_notes SET client_id = ?, service_id = ?, note_date = ?, amount = ?, payment_method = ?, reference = ?, status = ?, notes = ?, subtotal = ?, tax_rate = ?, tax_amount = ? WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);

$service_id = !empty($data->service_id) ? $data->service_id : null;
$reference = $data->reference ?? null;
$notes = $data->notes ?? null;
$status = $data->status ?? 'Pagada';
$subtotal = $data->subtotal ?? $data->amount;
$tax_rate = $data->tax_rate ?? 0;
$tax_amount = $data->tax_amount ?? 0;

$stmt->bind_param(
    'iisdssssdddii',
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
    $tax_amount,
    $data->id,
    $data->company_id
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Nota de pago actualizada.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la nota: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>