<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error fatal: ' . $error['message']]);
        exit();
    }
}
register_shutdown_function('handle_fatal_error');

try {
    include 'db_connect.php';
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos']);
    exit();
}

$document_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if (empty($document_id) || empty($company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parámetros inválidos']);
    exit();
}

// Obtener ruta del archivo antes de eliminar
$sql = "SELECT file_path FROM documents WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $document_id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
    exit();
}

$row = $result->fetch_assoc();
$file_path = __DIR__ . '/' . $row['file_path'];

// Eliminar de la base de datos
$sql = "DELETE FROM documents WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $document_id, $company_id);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar el documento: ' . $stmt->error]);
    $stmt->close();
    exit();
}

$stmt->close();

// Eliminar archivo físico
if (file_exists($file_path)) {
    unlink($file_path);
}

$conn->close();

echo json_encode([
    'success' => true,
    'message' => 'Documento eliminado correctamente'
]);

