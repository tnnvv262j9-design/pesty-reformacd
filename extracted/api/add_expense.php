<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id, $data->date, $data->description, $data->amount)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para registrar el gasto.']);
    exit();
}

$company_id = $data->company_id;
$date = $data->date;
$description = $data->description;
$amount = $data->amount;
$category = $data->category ?? 'Otros';
$technician_id = $data->technician_id ?? null;
$service_id = $data->service_id ?? null;

// AUTO-FIX: Asegurar columna service_id
$check = $conn->query("SHOW COLUMNS FROM expenses LIKE 'service_id'");
if ($check && $check->num_rows == 0) {
    $conn->query("ALTER TABLE expenses ADD COLUMN service_id INT NULL AFTER technician_id");
}

$sql = "INSERT INTO expenses (company_id, date, description, amount, category, technician_id, service_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("issdsii", $company_id, $date, $description, $amount, $category, $technician_id, $service_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Gasto registrado correctamente.', 'expense_id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al registrar el gasto: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>