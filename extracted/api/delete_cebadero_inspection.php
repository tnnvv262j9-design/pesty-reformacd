<?php
include 'db_connect.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($id === 0 || $company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID inválido.']);
    exit();
}

$check = $conn->prepare(
    "SELECT i.id, i.cebadero_id, i.evidence_photo_url 
     FROM cebadero_inspections i 
     JOIN cebaderos c ON i.cebadero_id = c.id 
     WHERE i.id = ? AND c.company_id = ?"
);
$check->bind_param("ii", $id, $company_id);
$check->execute();
$row = $check->get_result()->fetch_assoc();
$check->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Inspección no encontrada.']);
    exit();
}

$cebadero_id = intval($row['cebadero_id']);
$evidence_url = $row['evidence_photo_url'] ?? '';

$del = $conn->prepare("DELETE FROM cebadero_inspections WHERE id = ?");
$del->bind_param("i", $id);

if (!$del->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $del->error]);
    $del->close();
    $conn->close();
    exit();
}
$del->close();

if ($evidence_url) {
    $relative = $evidence_url;
    if (strpos($relative, 'api/') === 0) {
        $relative = substr($relative, 4);
    }
    $relative = ltrim($relative, '/');
    if (strpos($relative, 'uploads/evidence/') === 0) {
        $filePath = __DIR__ . '/' . $relative;
        if (is_file($filePath)) {
            @unlink($filePath);
        }
    }
}

$maxStmt = $conn->prepare("SELECT MAX(inspection_date) AS max_date FROM cebadero_inspections WHERE cebadero_id = ?");
$maxStmt->bind_param("i", $cebadero_id);
$maxStmt->execute();
$maxRow = $maxStmt->get_result()->fetch_assoc();
$maxStmt->close();

$last = null;
if ($maxRow && $maxRow['max_date']) {
    $last = explode(' ', $maxRow['max_date'])[0];
}

if ($last) {
    $upd = $conn->prepare("UPDATE cebaderos SET last_inspection = ? WHERE id = ? AND company_id = ?");
    $upd->bind_param("sii", $last, $cebadero_id, $company_id);
} else {
    $upd = $conn->prepare("UPDATE cebaderos SET last_inspection = NULL WHERE id = ? AND company_id = ?");
    $upd->bind_param("ii", $cebadero_id, $company_id);
}
$upd->execute();
$upd->close();

echo json_encode(['success' => true, 'message' => 'Inspección eliminada.']);
$conn->close();
?>

