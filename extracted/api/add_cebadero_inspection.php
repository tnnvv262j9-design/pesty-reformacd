<?php
include 'db_connect.php';

$company_id = isset($_POST['company_id']) ? intval($_POST['company_id']) : 0;
$cebadero_id = isset($_POST['cebadero_id']) ? intval($_POST['cebadero_id']) : 0;
$inspection_date = isset($_POST['date']) ? $_POST['date'] : '';
$tech_id = isset($_POST['tech_id']) ? intval($_POST['tech_id']) : 0;
$condition = isset($_POST['condition']) ? $_POST['condition'] : '';
$activity = isset($_POST['activity']) ? $_POST['activity'] : '';
$action = isset($_POST['action']) ? $_POST['action'] : '';
$amount = isset($_POST['amount']) ? $_POST['amount'] : '';
$notes = isset($_POST['notes']) ? $_POST['notes'] : '';

if ($company_id === 0 || $cebadero_id === 0 || $tech_id === 0 || !$inspection_date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos.']);
    exit();
}

$check = $conn->prepare("SELECT id FROM cebaderos WHERE id = ? AND company_id = ?");
$check->bind_param("ii", $cebadero_id, $company_id);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    $check->close();
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado.']);
    exit();
}
$check->close();

$dedupe = $conn->prepare(
    "SELECT id, evidence_photo_url FROM cebadero_inspections 
     WHERE cebadero_id = ? AND inspection_date = ? AND tech_id = ? 
       AND condition_status = ? AND activity_level = ? AND action_taken = ? 
       AND IFNULL(amount_replenished, '') = ? AND IFNULL(notes, '') = ?
     LIMIT 1"
);
$dedupe->bind_param(
    "isisssss",
    $cebadero_id,
    $inspection_date,
    $tech_id,
    $condition,
    $activity,
    $action,
    $amount,
    $notes
);
$dedupe->execute();
$existing = $dedupe->get_result()->fetch_assoc();
$dedupe->close();

if ($existing) {
    echo json_encode([
        'success' => true,
        'message' => 'Inspección ya registrada.',
        'id' => intval($existing['id']),
        'photo_url' => $existing['evidence_photo_url']
    ]);
    exit();
}

// Manejar carga de imagen si existe
$evidence_url = '';
if (isset($_FILES['evidence_photo']) && $_FILES['evidence_photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDirFs = __DIR__ . '/uploads/evidence/';
    if (!is_dir($uploadDirFs)) {
        mkdir($uploadDirFs, 0755, true);
    }

    $originalName = basename($_FILES['evidence_photo']['name']);
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $safeExt = preg_replace('/[^a-z0-9]+/', '', $ext);
    $safeExt = $safeExt ? ('.' . $safeExt) : '';

    $filename = 'ev_' . uniqid() . '_' . time() . $safeExt;
    $targetPathFs = $uploadDirFs . $filename;

    if (move_uploaded_file($_FILES['evidence_photo']['tmp_name'], $targetPathFs)) {
        $evidence_url = 'api/uploads/evidence/' . $filename;
    }
}

$stmt = $conn->prepare("INSERT INTO cebadero_inspections (cebadero_id, inspection_date, tech_id, condition_status, activity_level, action_taken, amount_replenished, evidence_photo_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isissssss", $cebadero_id, $inspection_date, $tech_id, $condition, $activity, $action, $amount, $evidence_url, $notes);

if ($stmt->execute()) {
    // Actualizar fecha de última inspección en el cebadero padre
    $update = $conn->prepare("UPDATE cebaderos SET last_inspection = ? WHERE id = ?");
    $dateOnly = explode('T', $inspection_date)[0]; // Asumiendo formato ISO
    $update->bind_param("si", $dateOnly, $cebadero_id);
    $update->execute();
    
    echo json_encode(['success' => true, 'message' => 'Inspección registrada.', 'id' => $stmt->insert_id, 'photo_url' => $evidence_url]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar inspección: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
