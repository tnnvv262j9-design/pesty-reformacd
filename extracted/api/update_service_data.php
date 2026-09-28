<?php
include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->new_date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de servicio o nueva fecha no proporcionados.']);
    exit();
}

$sql = "UPDATE services SET service_date = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('si', $data->new_date, $data->id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Fecha del servicio actualizada.']);
    } else {
        // CORRECCIÓN: Se devuelve 'success' => true aunque no haya filas afectadas.
        // Esto evita que el calendario revierta el cambio si se suelta en el mismo día.
        echo json_encode(['success' => true, 'message' => 'No se realizaron cambios, los datos ya estaban actualizados.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la fecha: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>