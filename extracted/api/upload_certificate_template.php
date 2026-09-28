<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

$company_id = $_POST['company_id'] ?? null;
$name = $_POST['template_name'] ?? 'Sin nombre';

if (!$company_id || !isset($_FILES['template_file'])) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit;
}

$file = $_FILES['template_file'];
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);

if (strtolower($ext) !== 'pdf') {
    echo json_encode(['success' => false, 'message' => 'Solo se admiten archivos PDF.']);
    exit;
}

$upload_dir = '../uploads/certificates/templates/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$filename = 'template_' . $company_id . '_' . time() . '.pdf';
$target_path = $upload_dir . $filename;

if (move_uploaded_file($file['tmp_name'], $target_path)) {
    $stmt = $conn->prepare("INSERT INTO certificate_templates (company_id, name, file_path) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $company_id, $name, $target_path);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al guardar en base de datos.']);
    }
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Error al subir el archivo.']);
}
?>
