<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'ensure_chemical_columns.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->name, $data->quantity_bought_ml, $data->price_total)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit();
}

$id = intval($data->id);
$name = $data->name;
$concentration = $data->concentration ?? '';
$rsco = $data->rsco ?? '';
$active_ingredient = $data->active_ingredient ?? '';
$batch_number = $data->batch_number ?? '';
$expiration_date = $data->expiration_date ?? NULL;
if (empty($expiration_date)) $expiration_date = NULL;

$quantity_bought_ml = floatval($data->quantity_bought_ml);
$price_total = floatval($data->price_total);
$min_stock_ml = isset($data->min_stock_ml) ? floatval($data->min_stock_ml) : 0;
$status = $data->status ?? 'active';
$type = $data->type ?? 'liquid';
$measurement_unit = $data->measurement_unit ?? 'ml';

if ($quantity_bought_ml <= 0) {
    echo json_encode(['success' => false, 'message' => 'La cantidad debe ser mayor a 0']);
    exit();
}

// Recalculate cost per ml
$cost_per_ml = $price_total / $quantity_bought_ml;

$sql = "UPDATE chemicals SET name=?, concentration=?, rsco=?, active_ingredient=?, batch_number=?, expiration_date=?, quantity_bought_ml=?, price_total=?, min_stock_ml=?, cost_per_ml=?, status=?, type=?, measurement_unit=? WHERE id=?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta (edit chemical): ' . $conn->error]);
    exit();
}
if (!$stmt->bind_param("ssssssddddsssi", $name, $concentration, $rsco, $active_ingredient, $batch_number, $expiration_date, $quantity_bought_ml, $price_total, $min_stock_ml, $cost_per_ml, $status, $type, $measurement_unit, $id)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error vinculando parámetros: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit();
}

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Químico actualizado exitosamente']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
