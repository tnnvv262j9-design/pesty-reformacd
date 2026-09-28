<?php
include 'db_connect.php';

header('Content-Type: application/json');

if (!isset($_POST['client_id']) || !isset($_FILES['map_file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos (ID de cliente o archivo).']);
    exit();
}

$client_id = intval($_POST['client_id']);

if ($_FILES['map_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al subir archivo: ' . $_FILES['map_file']['error']]);
    exit();
}

// Create uploads directory if not exists
$target_dir = "../uploads/maps/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

// Generate unique filename
$file_extension = pathinfo($_FILES['map_file']['name'], PATHINFO_EXTENSION);
$filename = "map_client_" . $client_id . "_" . time() . "." . $file_extension;
$target_file = $target_dir . $filename;
$public_url = "uploads/maps/" . $filename; // Relative path for DB

if (move_uploaded_file($_FILES['map_file']['tmp_name'], $target_file)) {
    // Update client record
    $stmt = $conn->prepare("UPDATE clients SET map_url = ? WHERE id = ?");
    $stmt->bind_param("si", $public_url, $client_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Plano subido exitosamente.', 'url' => $public_url]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar base de datos: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al mover el archivo subido.']);
}

$conn->close();
?>