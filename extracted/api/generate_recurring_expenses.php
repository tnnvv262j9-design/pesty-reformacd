<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->month, $data->year)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros (company_id, month, year).']);
    exit();
}

$company_id = $data->company_id;
$month = (int)$data->month;
$year = (int)$data->year;

// 1. Obtener gastos recurrentes activos
$sql = "SELECT * FROM recurring_expenses WHERE company_id = ? AND active = 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();

$inserted_count = 0;
$skipped_count = 0;

// Preparar sentencias UNA sola vez
// Check stmt
$check_date = "";
$check_desc = "";
$check_amount = 0.0;
$check_stmt = $conn->prepare("SELECT id FROM expenses WHERE company_id = ? AND date = ? AND description = ? AND amount = ?");
$check_stmt->bind_param("isss", $company_id, $check_date, $check_desc, $check_amount);

// Insert stmt
$ins_date = "";
$ins_desc = "";
$ins_amount = 0.0;
$ins_cat = "";
$insert_stmt = $conn->prepare("INSERT INTO expenses (company_id, date, description, amount, category, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
$insert_stmt->bind_param("issds", $company_id, $ins_date, $ins_desc, $ins_amount, $ins_cat);

while ($row = $result->fetch_assoc()) {
    // Calcular fecha
    $days_in_month = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    $day = min((int)$row['day_of_month'], $days_in_month);
    
    $current_date_str = sprintf("%04d-%02d-%02d", $year, $month, $day);
    
    // Asignar valores a variables vinculadas para el Check
    $check_date = $current_date_str;
    $check_desc = $row['description'];
    $check_amount = $row['amount']; // Convertir a string/float según sea necesario, bind "s" maneja decimales bien usualmente
    
    $check_stmt->execute();
    $check_stmt->store_result();
    
    if ($check_stmt->num_rows == 0) {
        // No existe, insertar
        $ins_date = $current_date_str;
        $ins_desc = $row['description'];
        $ins_amount = $row['amount'];
        $ins_cat = $row['category'];
        
        if ($insert_stmt->execute()) {
            $inserted_count++;
        }
    } else {
        $skipped_count++;
    }
    // Liberar resultado para siguiente iteración
    $check_stmt->free_result();
}

echo json_encode([
    'success' => true, 
    'message' => "Proceso completado. Insertados: $inserted_count. Omitidos (ya existen): $skipped_count.",
    'inserted' => $inserted_count,
    'skipped' => $skipped_count
]);

$stmt->close();
$check_stmt->close();
$insert_stmt->close();
$conn->close();
?>
