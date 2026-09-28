<?php
include 'db_connect.php';

// Añadir columna months_duration si no existe
$check = $conn->query("SHOW COLUMNS FROM recurring_expenses LIKE 'months_duration'");
if ($check && $check->num_rows == 0) {
    $conn->query("ALTER TABLE recurring_expenses ADD COLUMN months_duration INT DEFAULT 12 AFTER day_of_month");
}

// Añadir columna recurring_id a expenses
$check2 = $conn->query("SHOW COLUMNS FROM expenses LIKE 'recurring_id'");
if ($check2 && $check2->num_rows == 0) {
    $conn->query("ALTER TABLE expenses ADD COLUMN recurring_id INT DEFAULT NULL AFTER technician_id");
    $conn->query("ALTER TABLE expenses ADD INDEX (recurring_id)");
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->description, $data->amount, $data->category)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit();
}

$id = $data->id ?? null;
$company_id = $data->company_id;
$description = $data->description;
$amount = $data->amount;
$category = $data->category;
$day_of_month = $data->day_of_month ?? 1;
$active = $data->active ?? 1;
$months_duration = $data->months_duration ?? 12; // Nuevo parámetro

// 1. Guardar en recurring_expenses
if ($id) {
    // Update
    $sql = "UPDATE recurring_expenses SET description = ?, amount = ?, category = ?, day_of_month = ?, active = ?, months_duration = ? WHERE id = ? AND company_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sdsiiiii", $description, $amount, $category, $day_of_month, $active, $months_duration, $id, $company_id);
} else {
    // Insert
    $sql = "INSERT INTO recurring_expenses (company_id, description, amount, category, day_of_month, active, months_duration) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isdsiii", $company_id, $description, $amount, $category, $day_of_month, $active, $months_duration);
}

if ($stmt->execute()) {
    $inserted_id = $id ? $id : $stmt->insert_id;
    $message = 'Gasto recurrente guardado correctamente.';
    $inserted_count = 0;

    // 2. Generar gastos futuros si es nuevo y está activo
    if (!$id && $active) {
        $currentDate = new DateTime(); // Empieza hoy (mes actual)
        
        // Preparar sentencias
        $check_sql = "SELECT id FROM expenses WHERE company_id = ? AND date = ? AND description = ? AND amount = ?";
        $check_stmt = $conn->prepare($check_sql);
        
        $ins_stmt = $conn->prepare("INSERT INTO expenses (company_id, date, description, amount, category, created_at, recurring_id) VALUES (?, ?, ?, ?, ?, NOW(), ?)");
        
        // Variables para binding
        $loop_date_str = "";
        $check_stmt->bind_param("isss", $company_id, $loop_date_str, $description, $amount);
        $ins_stmt->bind_param("issdsi", $company_id, $loop_date_str, $description, $amount, $category, $inserted_id);
        
        // Iterar por la duración especificada (ej. 12 meses)
        for ($i = 0; $i < $months_duration; $i++) {
            $year = (int)$currentDate->format('Y');
            $month = (int)$currentDate->format('m');
            
            $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
            $day = min($day_of_month, $daysInMonth);
            
            $loop_date_str = sprintf("%04d-%02d-%02d", $year, $month, $day);
            
            // Check si ya existe (para no duplicar)
            $check_stmt->execute();
            $check_stmt->store_result();
            
            if ($check_stmt->num_rows == 0) {
                if ($ins_stmt->execute()) {
                    $inserted_count++;
                }
            }
            $check_stmt->free_result();
            
            // Avanzar al siguiente mes
            $currentDate->modify('+1 month');
        }
        
        $check_stmt->close();
        $ins_stmt->close();
        
        if ($inserted_count > 0) {
            $message .= " Se generaron $inserted_count gastos para los próximos $months_duration meses.";
        }
    }

    echo json_encode(['success' => true, 'message' => $message, 'inserted_count' => $inserted_count]);

} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
