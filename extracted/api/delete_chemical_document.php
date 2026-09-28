<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit;
}

$id = intval($data->id);
$company_id = intval($data->company_id);

// Get file path first
$stmt = $conn->prepare("SELECT file_path FROM chemical_documents WHERE id = ? AND company_id = ?");
$stmt->bind_param("ii", $id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Documento no encontrado.']);
    exit;
}

$row = $result->fetch_assoc();
$filePath = "../" . $row['file_path'];

// Delete from DB
$stmt = $conn->prepare("DELETE FROM chemical_documents WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    // Delete file from server
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    echo json_encode(['success' => true, 'message' => 'Documento eliminado.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar de base de datos.']);
}

$stmt->close();
$conn->close();
?>