<?php
include 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->client_id, $data->issue_date, $data->items, $data->total)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de factura incompletos.']);
    exit();
}

$sql = "UPDATE invoices SET client_id = ?, quote_id = ?, issue_date = ?, client_rfc = ?, cfdi_use = ?, tax_regime = ?, payment_method = ?, payment_form = ?, issuer_rfc = ?, expedition_place = ?, currency = ?, exchange_rate = ?, items = ?, subtotal = ?, tax = ?, total = ?, status = ?, notes = ? WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);

$items_json = json_encode($data->items);
$quote_id = !empty($data->quote_id) ? intval($data->quote_id) : null;

$stmt->bind_param(
    'iissssssssssdddssii',
    $data->client_id,
    $quote_id,
    $data->issue_date,
    $data->client_rfc,
    $data->cfdi_use,
    $data->tax_regime,
    $data->payment_method,
    $data->payment_form,
    $data->issuer_rfc,
    $data->expedition_place,
    $data->currency,
    $data->exchange_rate,
    $items_json,
    $data->subtotal,
    $data->tax,
    $data->total,
    $data->status,
    $data->notes,
    $data->id,
    $data->company_id
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Factura actualizada.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la factura: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>