<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
require_once 'check_limits.php';

// Manejar errores fatales
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

// Verificar que sea una petición POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Verificar que se haya subido un archivo
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se subió ningún archivo o hubo un error en la subida']);
    exit();
}

// Obtener datos del formulario
$company_id = intval($_POST['company_id'] ?? 0);
$name = trim($_POST['name'] ?? '');

// --- Verificar Límite de Documentos (Biblioteca) ---
$limitCheck = checkLimit($conn, $company_id, 'document');
// Si el límite no está definido o es permitido, continuar
if (isset($limitCheck['allowed']) && !$limitCheck['allowed']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
    exit();
}
// ---------------------------------------------------

$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? 'Otros');
$expiration_date = !empty($_POST['expiration_date']) ? $_POST['expiration_date'] : null;
$uploaded_by = isset($_POST['uploaded_by']) ? intval($_POST['uploaded_by']) : null;

// Validar datos requeridos
if (empty($company_id) || empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos (company_id, name)']);
    exit();
}

// Validar archivo
$file = $_FILES['file'];
$file_name = $file['name'];
$file_tmp = $file['tmp_name'];
$file_size = $file['size'];
$file_type = $file['type'];
$file_error = $file['error'];

// Validar tamaño (máximo 10MB)
$max_size = 10 * 1024 * 1024; // 10MB
if ($file_size > $max_size) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 10MB']);
    exit();
}

// Validar tipo de archivo (solo PDF, imágenes, Word, Excel)
$allowed_types = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

$file_extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
$allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx'];

if (!in_array($file_type, $allowed_types) || !in_array($file_extension, $allowed_extensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo se permiten: PDF, imágenes, Word, Excel']);
    exit();
}

// Crear directorio de documentos si no existe
$upload_dir = __DIR__ . '/uploads/documents/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Generar nombre único para el archivo
$unique_name = uniqid() . '_' . time() . '.' . $file_extension;
$file_path = $upload_dir . $unique_name;

// Mover archivo
if (!move_uploaded_file($file_tmp, $file_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar el archivo']);
    exit();
}

// Guardar en base de datos
$sql = "INSERT INTO documents (company_id, name, description, category, file_name, file_path, file_size, file_type, expiration_date, uploaded_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    unlink($file_path); // Eliminar archivo si falla la inserción
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    exit();
}

// Ruta relativa para guardar en BD
$relative_path = 'uploads/documents/' . $unique_name;

$stmt->bind_param('isssssissi', 
    $company_id,
    $name,
    $description,
    $category,
    $file_name,
    $relative_path,
    $file_size,
    $file_type,
    $expiration_date,
    $uploaded_by
);

if (!$stmt->execute()) {
    unlink($file_path); // Eliminar archivo si falla la inserción
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar en la base de datos: ' . $stmt->error]);
    $stmt->close();
    exit();
}

$document_id = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'message' => 'Documento subido correctamente',
    'document_id' => $document_id
]);
