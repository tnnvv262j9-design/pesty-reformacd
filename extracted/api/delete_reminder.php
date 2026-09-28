<?php
include 'db_connect.php';

// Validar que se haya proporcionado un ID
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'No se proporcionó un ID de recordatorio.']);
    exit();
}

$id = intval($_GET['id']);

$stmt = $conn->prepare("DELETE FROM reminders WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Recordatorio eliminado correctamente.']);
    } else {
        // Si no se afectaron filas, es probable que el ID no existiera
        echo json_encode(['success' => false, 'message' => 'No se encontró ningún recordatorio con ese ID.']);
    }
} else {
    // Error en la ejecución de la consulta
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error del servidor al intentar eliminar el recordatorio: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>