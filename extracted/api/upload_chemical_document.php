<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Ensure table exists
$ensureSql = "CREATE TABLE IF NOT EXISTS chemical_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    chemical_id INT NOT NULL,
    type ENUM('datasheet', 'method') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (chemical_id),
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
$conn->query($ensureSql);

// Check if file and data are present
if (!isset($_FILES['file']) || !isset($_POST['chemical_id']) || !isset($_POST['type']) || !isset($_POST['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit;
}

$chemical_id = intval($_POST['chemical_id']);
$company_id = intval($_POST['company_id']);
$type = $_POST['type']; // 'datasheet' or 'method'

if (!in_array($type, ['datasheet', 'method'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo de documento inválido.']);
    exit;
}

// Create upload directory if not exists
$targetDir = "../uploads/chemicals/" . $company_id . "/";
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$fileName = basename($_FILES["file"]["name"]);
// Generate unique filename to avoid conflicts
$uniqueName = uniqid() . '_' . preg_replace("/[^a-zA-Z0-9\._-]/", "", $fileName);
$targetFilePath = $targetDir . $uniqueName;
$dbFilePath = "uploads/chemicals/" . $company_id . "/" . $uniqueName;

// Validate file type (PDF, Images, Word)
$fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));
$allowedTypes = array('pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx');

if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Solo se permiten archivos PDF, JPG, PNG, DOC y DOCX.']);
    exit;
}

if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetFilePath)) {
    // Insert into database
    $stmt = $conn->prepare("INSERT INTO chemical_documents (company_id, chemical_id, type, file_path, file_name) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iisss", $company_id, $chemical_id, $type, $dbFilePath, $fileName);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Documento subido correctamente.', 'id' => $stmt->insert_id]);
    } else {
        unlink($targetFilePath); // Delete file if DB insert fails
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al guardar en base de datos: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Hubo un error al subir el archivo.']);
}

$conn->close();
?>
