<?php
require_once 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'technician';
$technician_id = isset($_GET['technician_id']) ? intval($_GET['technician_id']) : 0;
$epp_delivery_id = isset($_GET['epp_delivery_id']) ? intval($_GET['epp_delivery_id']) : 0;
$service_id = isset($_GET['service_id']) ? intval($_GET['service_id']) : 0;

if ($company_id <= 0) {
    http_response_code(400);
    echo 'company_id requerido';
    exit;
}

$headers = [];
$rows = [];

if ($mode === 'technician' && $technician_id > 0) {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status, m.maintenance_date, m.type, m.notes FROM epp_deliveries d LEFT JOIN epp_maintenance m ON d.id = m.epp_delivery_id WHERE d.company_id = ? AND d.technician_id = ? ORDER BY d.delivery_date DESC, m.maintenance_date DESC");
    $stmt->bind_param("ii", $company_id, $technician_id);
    $headers = ['Entrega','Equipo','Cantidad','Estado','Fecha','Tipo','Notas'];
} elseif ($mode === 'item' && $epp_delivery_id > 0) {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status, m.maintenance_date, m.type, m.notes FROM epp_deliveries d LEFT JOIN epp_maintenance m ON d.id = m.epp_delivery_id WHERE d.company_id = ? AND d.id = ? ORDER BY m.maintenance_date DESC");
    $stmt->bind_param("ii", $company_id, $epp_delivery_id);
    $headers = ['Entrega','Equipo','Cantidad','Estado','Fecha','Tipo','Notas'];
} elseif ($mode === 'service' && $service_id > 0) {
    $stmt = $conn->prepare("SELECT u.equipment_type, u.used_quantity, u.notes FROM epp_service_usage u WHERE u.company_id = ? AND u.service_id = ? ORDER BY u.created_at DESC");
    $stmt->bind_param("ii", $company_id, $service_id);
    $headers = ['Equipo','Cantidad','Notas'];
} else {
    $stmt = $conn->prepare("SELECT d.delivery_date, d.equipment_type, d.quantity, d.equipment_status FROM epp_deliveries d WHERE d.company_id = ? ORDER BY d.delivery_date DESC");
    $stmt->bind_param("i", $company_id);
    $headers = ['Entrega','Equipo','Cantidad','Estado'];
}
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_row()) $rows[] = $row;
$stmt->close();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=bitacora_epp.csv');
$output = fopen('php://output', 'w');
fputcsv($output, $headers);
foreach ($rows as $r) {
    fputcsv($output, $r);
}
fclose($output);
exit;
?>
