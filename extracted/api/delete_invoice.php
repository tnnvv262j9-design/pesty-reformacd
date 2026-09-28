<?php
include 'db_connect.php';

if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se proporcionó un ID de factura.']);
    exit();
}

$id = intval($_GET['id']);

$stmt = $conn->prepare("DELETE FROM invoices WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Factura eliminada.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se encontró la factura.']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>