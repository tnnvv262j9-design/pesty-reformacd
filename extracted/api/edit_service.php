<?php
include 'db_connect.php';
require_once 'encryption_service.php'; // Incluir servicio de encriptación

$data = json_decode(file_get_contents("php://input"));
$encryption = new EncryptionService(); // Instanciar servicio

// --- MEJORA: Validación más estricta de todos los campos necesarios ---
if (!isset($data->id, $data->client_id, $data->technician_id, $data->status, $data->service_date, $data->price)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para actualizar el servicio. Faltan campos esenciales.']);
    exit();
}

// --- MEJORA: Asignar a variables y asegurar los tipos de datos ---
$id = intval($data->id);
$client_id = intval($data->client_id);
$client_site_id = isset($data->client_site_id) && $data->client_site_id !== '' ? intval($data->client_site_id) : null;
$technician_id = intval($data->technician_id);
$status = trim($data->status);
$service_date = trim($data->service_date);
$service_time = $data->service_time ?? '00:00:00';
$service_type = $data->service_type ?? '';
$pests = $data->pests ?? '';
$notes = !empty($data->notes) ? $encryption->encrypt($data->notes) : '';
$price = floatval($data->price);
$reinforcement_days = isset($data->reinforcement_days) && $data->reinforcement_days !== '' ? $data->reinforcement_days : null;

$has_client_site_column = false;
$check_result = $conn->query("SHOW COLUMNS FROM services LIKE 'client_site_id'");
if ($check_result && $check_result->num_rows > 0) {
    $has_client_site_column = true;
}

if ($has_client_site_column) {
    $sql = "UPDATE services SET client_id = ?, client_site_id = ?, technician_id = ?, status = ?, service_date = ?, service_time = ?, service_type = ?, pests = ?, notes = ?, price = ?, reinforcement_days = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparando actualización de servicio (con sucursal): ' . $conn->error);
    }
    $stmt->bind_param(
        'iiissssssdii',
        $client_id,
        $client_site_id,
        $technician_id,
        $status,
        $service_date,
        $service_time,
        $service_type,
        $pests,
        $notes,
        $price,
        $reinforcement_days,
        $id
    );
} else {
    $sql = "UPDATE services SET client_id = ?, technician_id = ?, status = ?, service_date = ?, service_time = ?, service_type = ?, pests = ?, notes = ?, price = ?, reinforcement_days = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparando actualización de servicio: ' . $conn->error);
    }
    $stmt->bind_param(
        'iissssssdii',
        $client_id,
        $technician_id,
        $status,
        $service_date,
        $service_time,
        $service_type,
        $pests,
        $notes,
        $price,
        $reinforcement_days,
        $id
    );
}

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Servicio actualizado correctamente.']);
    } else {
        // Se devuelve 'success' => true para que la UI no revierta el cambio si el usuario no modificó nada.
        echo json_encode(['success' => true, 'message' => 'No se realizaron cambios, los datos ya estaban actualizados o el servicio no fue encontrado.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el servicio en la base de datos: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
