<?php
header('Content-Type: application/json');
include 'db_connect.php';

$id = $_GET['id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

if (!$id || !$company_id) {
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros.']);
    exit;
}

// Obtener ruta del archivo para borrarlo
$stmt = $conn->prepare("SELECT file_path FROM certificate_templates WHERE id = ? AND company_id = ?");
$stmt->bind_param("ii", $id, $company_id);
$stmt->execute();
$res = $stmt->get_result();
$template = $res->fetch_assoc();

if ($template) {
    if (file_exists($template['file_path'])) {
        unlink($template['file_path']);
    }
    
    $del = $conn->prepare("DELETE FROM certificate_templates WHERE id = ?");
    $del->bind_param("i", $id);
    $del->execute();
    
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Plantilla no encontrada.']);
}
?>
