<?php
include 'db_connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->cebadero_id) || !isset($data->x) || !isset($data->y)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos (ID, X, Y).']);
    exit();
}

$cebadero_id = intval($data->cebadero_id);
$x = floatval($data->x);
$y = floatval($data->y);

$stmt = $conn->prepare("UPDATE cebaderos SET map_x = ?, map_y = ? WHERE id = ?");
$stmt->bind_param("ddi", $x, $y, $cebadero_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Coordenadas actualizadas.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>