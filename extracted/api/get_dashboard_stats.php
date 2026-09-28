<?php
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($company_id === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de compañía no proporcionado.']);
    exit();
}

$response = ['success' => true, 'stats' => []];

// Función auxiliar para obtener un solo valor de una consulta COUNT
function fetch_count($stmt) {
    $count = 0;
    $stmt->execute();
    $stmt->bind_result($count);
    $stmt->fetch();
    $stmt->close();
    return $count;
}

// 1. Número de citas agendadas para el día de hoy
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM services WHERE company_id = ? AND service_date = CURDATE()");
$stmt->bind_param("i", $company_id);
$response['stats']['today_services'] = fetch_count($stmt);

// 2. Cantidad de servicios programados (pendientes)
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM services WHERE company_id = ? AND status = 'Pendiente'");
$stmt->bind_param("i", $company_id);
$response['stats']['pending_services'] = fetch_count($stmt);

// 3. Total de clientes activos
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM clients WHERE company_id = ?");
$stmt->bind_param("i", $company_id);
$response['stats']['active_clients'] = fetch_count($stmt);

// 4. Total de servicios realizados en el mes actual
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM services WHERE company_id = ? AND status = 'Realizado' AND MONTH(service_date) = MONTH(CURDATE()) AND YEAR(service_date) = YEAR(CURDATE())");
$stmt->bind_param("i", $company_id);
$response['stats']['month_completed_services'] = fetch_count($stmt);

// 5. Ingresos estimados del mes (sin cambios en la lógica)
$precio_estimado_por_servicio = 500;
$response['stats']['estimated_income'] = $response['stats']['month_completed_services'] * $precio_estimado_por_servicio;

echo json_encode($response);

$conn->close();
?>