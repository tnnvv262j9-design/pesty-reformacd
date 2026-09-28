<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Verificar si se subió un archivo
if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No se pudo subir el archivo']);
    exit;
}

$file = $_FILES['logo'];
$fileName = $file['name'];
$fileTmpName = $file['tmp_name'];
$fileSize = $file['size'];
$fileError = $file['error'];
$fileType = $file['type'];

// Validar tipo de archivo
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
if (!in_array($fileType, $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WebP, SVG)']);
    exit;
}

// Validar tamaño del archivo (máximo 5MB)
if ($fileSize > 5 * 1024 * 1024) {
    echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. Tamaño máximo: 5MB']);
    exit;
}

// Generar nombre único para el archivo
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$uniqueFileName = 'logo_' . uniqid() . '_' . time() . '.' . $fileExtension;

// Directorio de destino (ruta absoluta)
$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$uploadPath = $uploadDir . $uniqueFileName;

// Mover el archivo al directorio de destino
if (move_uploaded_file($fileTmpName, $uploadPath)) {
    // Devolver la URL relativa del archivo
    $logoUrl = 'api/uploads/' . $uniqueFileName;
    
    echo json_encode([
        'success' => true,
        'message' => 'Logo subido exitosamente',
        'logo_url' => $logoUrl,
        'file_name' => $uniqueFileName
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al guardar el archivo']);
}
?>