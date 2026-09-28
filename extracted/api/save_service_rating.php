<?php
// api/save_service_rating.php
header('Content-Type: application/json');
include 'db_connect.php';

// Obtener datos
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->service_id) || !isset($data->rating)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$service_id = intval($data->service_id);
$rating = intval($data->rating);
$comment = isset($data->comment) ? $data->comment : '';

// Validar rango de rating
if ($rating < 1 || $rating > 5) {
    echo json_encode(['success' => false, 'message' => 'Calificación inválida']);
    exit;
}

// Actualizar servicio
$stmt = $conn->prepare("UPDATE services SET rating = ?, rating_comment = ? WHERE id = ?");
$stmt->bind_param("isi", $rating, $comment, $service_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => '¡Gracias por tu calificación!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>