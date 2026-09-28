<?php
include 'db_connect.php';

$id = $_GET['id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

if (!$id || !$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros.']);
    exit();
}

// 1. Eliminar los gastos generados asociados (si existen, usando la columna recurring_id)
// Verificamos si existe la columna recurring_id antes de intentar borrar
$check = $conn->query("SHOW COLUMNS FROM expenses LIKE 'recurring_id'");
$expenses_deleted = 0;

if ($check && $check->num_rows > 0) {
    $del_expenses_sql = "DELETE FROM expenses WHERE recurring_id = ? AND company_id = ?";
    $del_stmt = $conn->prepare($del_expenses_sql);
    $del_stmt->bind_param("ii", $id, $company_id);
    if ($del_stmt->execute()) {
        $expenses_deleted = $del_stmt->affected_rows;
    }
    $del_stmt->close();
}

// 2. Eliminar la configuración recurrente
$sql = "DELETE FROM recurring_expenses WHERE id = ? AND company_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $id, $company_id);

if ($stmt->execute()) {
    $msg = 'Gasto recurrente eliminado.';
    if ($expenses_deleted > 0) {
        $msg .= " También se eliminaron $expenses_deleted gastos generados de la lista.";
    }
    echo json_encode(['success' => true, 'message' => $msg]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
