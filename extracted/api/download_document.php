<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    include 'db_connect.php';
} catch (Exception $e) {
    http_response_code(500);
    die('Error de conexión a la base de datos');
}

$document_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if (empty($document_id) || empty($company_id)) {
    http_response_code(400);
    die('Parámetros inválidos');
}

$sql = "SELECT file_name, file_path, file_type FROM documents WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $document_id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    die('Documento no encontrado');
}

$row = $result->fetch_assoc();
$file_path = __DIR__ . '/' . $row['file_path'];

if (!file_exists($file_path)) {
    http_response_code(404);
    die('Archivo no encontrado en el servidor');
}

// Enviar archivo
header('Content-Type: ' . $row['file_type']);
header('Content-Disposition: attachment; filename="' . $row['file_name'] . '"');
header('Content-Length: ' . filesize($file_path));
readfile($file_path);

$stmt->close();
$conn->close();
exit();

