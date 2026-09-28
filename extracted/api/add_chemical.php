<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'check_limits.php';
include 'ensure_chemical_columns.php';
require_once 'audit_log_helper.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->name, $data->quantity_bought_ml, $data->price_total)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit();
}

$company_id = intval($data->company_id);

// Check limits
$limit_check = checkLimit($conn, $company_id, 'chemical');
if (!$limit_check['allowed']) {
    echo json_encode(['success' => false, 'message' => $limit_check['message']]);
    exit();
}

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
$type = $data->type ?? 'liquid';
$measurement_unit = $data->measurement_unit ?? 'ml';

if ($quantity_bought_ml <= 0) {
    echo json_encode(['success' => false, 'message' => 'La cantidad debe ser mayor a 0']);
    exit();
}

$cost_per_ml = $price_total / $quantity_bought_ml;
$current_stock_ml = $quantity_bought_ml;

$sql = "INSERT INTO chemicals (company_id, name, concentration, rsco, active_ingredient, batch_number, expiration_date, quantity_bought_ml, price_total, current_stock_ml, min_stock_ml, cost_per_ml, status, type, measurement_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta (chemicals): ' . $conn->error]);
    exit();
}
$stmt->bind_param("issssssdddddss", $company_id, $name, $concentration, $rsco, $active_ingredient, $batch_number, $expiration_date, $quantity_bought_ml, $price_total, $current_stock_ml, $min_stock_ml, $cost_per_ml, $type, $measurement_unit);

if ($stmt->execute()) {
    $chemical_id = $stmt->insert_id;
    
    // Log initial history
    $hist_sql = "INSERT INTO inventory_history (company_id, chemical_id, change_type, quantity_change, previous_stock, new_stock, notes, created_at) VALUES (?, ?, 'initial', ?, 0, ?, 'Inventario Inicial', NOW())";
    $hist_stmt = $conn->prepare($hist_sql);
    if ($hist_stmt) {
        $hist_stmt->bind_param("iidd", $company_id, $chemical_id, $quantity_bought_ml, $quantity_bought_ml);
        $hist_stmt->execute();
        $hist_stmt->close();
    } else {
        // Log error but don't fail the whole request since chemical was added
        error_log("Error preparing history statement: " . $conn->error);
    }

    $requesting_user_id = $data->requesting_user_id ?? null;
    log_audit_event($conn, $company_id, $requesting_user_id, 'inventario', 'create', 'chemical', $chemical_id, "Se agregó el producto químico: $name");
    
    echo json_encode(['success' => true, 'message' => 'Químico agregado exitosamente']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al agregar químico: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
