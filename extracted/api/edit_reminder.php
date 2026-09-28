<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id, $data->text)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para editar el recordatorio.']);
    exit();
}

$id = $data->id;
$text = $data->text;

$sql = "UPDATE reminders SET text = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('si', $text, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Recordatorio actualizado.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
?>