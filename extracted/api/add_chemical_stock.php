<?php
header('Content-Type: application/json');
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->ml_to_add)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit();
}

$id = intval($data->id);
$ml_to_add = floatval($data->ml_to_add);
$cost = isset($data->cost) ? floatval($data->cost) : 0;
$batch_number = $data->batch_number ?? '';
$expiration_date = $data->expiration_date ?? '';

if ($ml_to_add <= 0) {
    echo json_encode(['success' => false, 'message' => 'La cantidad a añadir debe ser positiva']);
    exit();
}

// 1. Get current stock, company_id, and current cost info
$stmt_get = $conn->prepare("SELECT current_stock_ml, company_id, cost_per_ml, price_total FROM chemicals WHERE id = ?");
if (!$stmt_get) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error preparando consulta (get stock): ' . $conn->error]);
    exit();
}
$stmt_get->bind_param("i", $id);
$stmt_get->execute();
$result = $stmt_get->get_result();

if ($row = $result->fetch_assoc()) {
    $previous_stock = floatval($row['current_stock_ml']);
    $company_id = intval($row['company_id']);
    $old_cost_per_ml = floatval($row['cost_per_ml']);
    $new_stock = $previous_stock + $ml_to_add;
    
    // Calculate new weighted cost per ml
    // If cost is provided, we use it to update the average.
    // If not provided, we assume the cost per ml is the same as before (no price change).
    $new_cost_per_ml = $old_cost_per_ml;
    
    if ($cost > 0) {
        $added_cost_per_ml = $cost / $ml_to_add;
        // Weighted Average: ((OldStock * OldCost) + (AddedStock * AddedCost)) / TotalStock
        // Note: OldStock could be 0.
        $total_value = ($previous_stock * $old_cost_per_ml) + $cost;
        $new_cost_per_ml = $total_value / $new_stock;
    }

    // 2. Update stock and batch info
    $sql = "UPDATE chemicals SET current_stock_ml = ?, cost_per_ml = ?, batch_number = ?, expiration_date = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error preparando consulta (update stock): ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("ddssi", $new_stock, $new_cost_per_ml, $batch_number, $expiration_date, $id);

    if ($stmt->execute()) {
        // 3. Log history
        $notes = "Stock Añadido Manualmente. Lote: $batch_number, Cad: $expiration_date";
        if ($cost > 0) $notes .= ", Costo Agregado: $$cost";
        
        $hist_sql = "INSERT INTO inventory_history (company_id, chemical_id, change_type, quantity_change, previous_stock, new_stock, notes, created_at) VALUES (?, ?, 'purchase', ?, ?, ?, ?, NOW())";
        $hist_stmt = $conn->prepare($hist_sql);
        if ($hist_stmt) {
            $hist_stmt->bind_param("iiddds", $company_id, $id, $ml_to_add, $previous_stock, $new_stock, $notes);
            $hist_stmt->execute();
        } else {
             error_log("Error preparing history statement in add_chemical_stock: " . $conn->error);
        }

        echo json_encode(['success' => true, 'message' => 'Stock actualizado exitosamente']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar stock: ' . $stmt->error]);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Químico no encontrado']);
}

$stmt_get->close();
if (isset($stmt)) $stmt->close();
$conn->close();
?>
