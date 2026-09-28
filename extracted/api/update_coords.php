<?php
header('Content-Type: application/json');
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->lat) || !isset($data->lng) || !isset($data->type)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$lat = floatval($data->lat);
$lng = floatval($data->lng);
$id = intval($data->id);

if ($data->type === 'client') {
    $sql = "UPDATE clients SET latitude = ?, longitude = ? WHERE id = ?";
} else if ($data->type === 'site') {
    $sql = "UPDATE client_sites SET latitude = ?, longitude = ? WHERE id = ?";
} else {
    echo json_encode(['success' => false, 'message' => 'Tipo inválido']);
    exit;
}

$stmt = $conn->prepare($sql);
$stmt->bind_param("ddi", $lat, $lng, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}

$stmt->close();
$conn->close();
?>