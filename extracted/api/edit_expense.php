<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->date, $data->description, $data->amount)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para actualizar el gasto.']);
    exit();
}

$id = $data->id;
$date = $data->date;
$description = $data->description;
$amount = $data->amount;
$category = $data->category ?? 'Otros';
$technician_id = $data->technician_id ?? null;
$service_id = $data->service_id ?? null;

// AUTO-FIX: Asegurar columna service_id (por si se edita antes de crear uno nuevo)
$check = $conn->query("SHOW COLUMNS FROM expenses LIKE 'service_id'");
if ($check && $check->num_rows == 0) {
    $conn->query("ALTER TABLE expenses ADD COLUMN service_id INT NULL AFTER technician_id");
}

$sql = "UPDATE expenses SET date = ?, description = ?, amount = ?, category = ?, technician_id = ?, service_id = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssdsiii", $date, $description, $amount, $category, $technician_id, $service_id, $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Gasto actualizado.']);
    } else {
        echo json_encode(['success' => true, 'message' => 'No se realizaron cambios.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el gasto: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>