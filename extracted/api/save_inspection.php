<?php
include 'db_connect.php';

header('Content-Type: application/json');

// --- CAMBIO CLAVE: Validar datos de $_POST y $_FILES ---
if (!isset($_POST['service_id']) || !isset($_POST['checklist_data']) || !isset($_FILES['signature'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de inspección incompletos. Se requiere ID, checklist y firma.']);
    exit();
}

$service_id = intval($_POST['service_id']);
$checklist_json = $_POST['checklist_data']; // Asumimos que ya viene como JSON string
$signature_file = $_FILES['signature'];

// --- Guardar la firma como archivo ---
$signatures_dir = 'signatures/';
if (!is_dir($signatures_dir)) {
    if (!mkdir($signatures_dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo crear el directorio de firmas.']);
        exit();
    }
}

// Validar y mover el archivo subido
if ($signature_file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al subir el archivo de la firma.']);
    exit();
}

$file_extension = strtolower(pathinfo($signature_file["name"], PATHINFO_EXTENSION));
if ($file_extension !== 'png') {
     http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El formato de la firma debe ser PNG.']);
    exit();
}

$signature_filename = 'signature_' . $service_id . '_' . time() . '.png';
$signature_path = $signatures_dir . $signature_filename;

if (!move_uploaded_file($signature_file['tmp_name'], $signature_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'No se pudo guardar la imagen de la firma en el servidor.']);
    exit();
}

// --- Actualizar la base de datos ---
$sql = "UPDATE services SET inspection_data = ?, signature_path = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ssi', $checklist_json, $signature_path, $service_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Inspección y firma guardadas correctamente.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar los datos de la inspección en la base de datos: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>