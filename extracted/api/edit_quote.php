<?php
include 'db_connect.php';
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->client_id, $data->issue_date, $data->items, $data->total)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de cotización incompletos.']);
    exit();
}

$sql = "UPDATE quotes SET client_id = ?, issue_date = ?, due_date = ?, items = ?, subtotal = ?, discount = ?, total = ?, status = ?, notes = ? WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);

$items_json = json_encode($data->items);
$stmt->bind_param(
    'isssddsssii',
    $data->client_id,
    $data->issue_date,
    $data->due_date,
    $items_json,
    $data->subtotal,
    $data->discount,
    $data->total,
    $data->status,
    $data->notes,
    $data->id,
    $data->company_id
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cotización actualizada.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la cotización: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>